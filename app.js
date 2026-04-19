const SUPABASE_URL = "https://lyhqlhqrazxhjpxxllqg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aHFsaHFyYXp4aGpweHhsbHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTk0NTMsImV4cCI6MjA5MjEzNTQ1M30.r4PXoKM15VBItcKH7VhmabzwwXXPSVy9uN3nGB8b9rCQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let selectedNovelId = null;

window.addEventListener("DOMContentLoaded", async () => {
    await checkSession();
    await loadNovels();
});

async function checkSession() {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        currentUser = data.session.user;
        await loadProfile();
        updateUI();
    }
}

async function loadProfile() {
    const { data } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

    currentProfile = data;
}

function updateUI() {
    const userBox = document.getElementById("userBox");

    if (!currentUser) {
        userBox.innerHTML = `
            <button onclick="showLogin()">Login</button>
            <button onclick="showRegister()">Register</button>
        `;
    } else {
        userBox.innerHTML = `
            <span>${currentProfile.username} (${currentProfile.role})</span>
            <button onclick="logout()">Logout</button>
        `;
    }
}

async function register() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const username = document.getElementById("username").value;

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        alert(error.message);
        return;
    }

    const userId = data.user.id;

    let role = "member";

    if (email === "varen@dev.com" && password === "farel1211") {
        role = "developer";
    }

    await supabaseClient.from("profiles").insert({
        id: userId,
        username,
        role
    });

    alert("Register berhasil");
}

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert(error.message);
        return;
    }

    currentUser = data.user;
    await loadProfile();
    updateUI();
    loadNovels();
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

async function uploadCover(file) {
    const fileName = Date.now() + "_" + file.name;

    const { error } = await supabaseClient.storage
        .from("novel-covers")
        .upload(fileName, file);

    if (error) {
        alert(error.message);
        return null;
    }

    const { data } = supabaseClient.storage
        .from("novel-covers")
        .getPublicUrl(fileName);

    return data.publicUrl;
}

async function addNovel() {
    if (!currentUser) return alert("Login dulu");

    const title = document.getElementById("novelTitle").value;
    const description = document.getElementById("novelDesc").value;
    const coverFile = document.getElementById("coverFile").files[0];

    let cover_url = "";

    if (coverFile) {
        cover_url = await uploadCover(coverFile);
    }

    const { error } = await supabaseClient.from("novels").insert({
        title,
        description,
        cover_url,
        author_id: currentUser.id
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Novel berhasil ditambahkan");
    loadNovels();
}

async function loadNovels() {
    const { data } = await supabaseClient
        .from("novels")
        .select("*")
        .order("created_at", { ascending: false });

    const container = document.getElementById("novelList");
    container.innerHTML = "";

    data.forEach(novel => {
        container.innerHTML += `
            <div class="novel-card">
                <img src="${novel.cover_url}" width="120">
                <h3>${novel.title}</h3>
                <p>${novel.description}</p>
                <button onclick="openNovel('${novel.id}')">Buka</button>
            </div>
        `;
    });
}

async function openNovel(id) {
    selectedNovelId = id;
    loadChapters(id);
    loadComments(id);
}

async function addChapter() {
    if (!currentUser) return alert("Login dulu");

    const title = document.getElementById("chapterTitle").value;
    const content = document.getElementById("chapterContent").value;

    const { error } = await supabaseClient.from("chapters").insert({
        novel_id: selectedNovelId,
        title,
        content
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Chapter berhasil ditambah");
    loadChapters(selectedNovelId);
}

async function loadChapters(novelId) {
    const { data } = await supabaseClient
        .from("chapters")
        .select("*")
        .eq("novel_id", novelId)
        .order("created_at");

    const container = document.getElementById("chapterList");
    container.innerHTML = "";

    data.forEach(chapter => {
        container.innerHTML += `
            <div class="chapter-item">
                <h4>${chapter.title}</h4>
                <pre>${chapter.content}</pre>
            </div>
        `;
    });
}

async function addComment() {
    if (!currentUser) return alert("Login dulu");

    const text = document.getElementById("commentText").value;

    const { error } = await supabaseClient.from("comments").insert({
        novel_id: selectedNovelId,
        user_id: currentUser.id,
        content: text
    });

    if (error) {
        alert(error.message);
        return;
    }

    document.getElementById("commentText").value = "";
    loadComments(selectedNovelId);
}

async function loadComments(novelId) {
    const { data } = await supabaseClient
        .from("comments")
        .select(`
            *,
            profiles(username)
        `)
        .eq("novel_id", novelId)
        .order("created_at");

    const container = document.getElementById("commentList");
    container.innerHTML = "";

    data.forEach(comment => {
        container.innerHTML += `
            <div class="comment">
                <b>${comment.profiles.username}</b>
                <p>${comment.content}</p>
            </div>
        `;
    });
}
