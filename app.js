const SUPABASE_URL = "https://lyhqlhqrazxhjpxxllqg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aHFsaHFyYXp4aGpweHhsbHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTk0NTMsImV4cCI6MjA5MjEzNTQ1M30.r4PXoKM15VBItcKH7VhmabzwwXPSVy9uN3nGB8b9rCQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentProfile = null;

async function register() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("Email dan password wajib diisi");
        return;
    }

    const { error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Register berhasil. Silakan login.");
}

async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

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
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

async function loadProfile() {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    currentProfile = data;

    document.getElementById("authBox").classList.add("hidden");
    document.getElementById("userBox").classList.remove("hidden");

    document.getElementById("userInfo").innerText =
        `Login sebagai ${data.username} (${data.role})`;

    if (["writer", "admin", "developer"].includes(data.role)) {
        document.getElementById("novelForm").classList.remove("hidden");
    }

    loadNovels();
}

async function uploadCover(file) {
    const fileName = `${Date.now()}_${file.name}`;

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
    if (!currentUser) {
        alert("Silakan login");
        return;
    }

    const title = document.getElementById("novelTitle").value.trim();
    const description = document.getElementById("novelDesc").value.trim();
    const file = document.getElementById("coverFile").files[0];

    if (!title) {
        alert("Judul novel wajib diisi");
        return;
    }

    let cover_url = null;

    if (file) {
        cover_url = await uploadCover(file);
    }

    const { error } = await supabaseClient
        .from("novels")
        .insert([{
            title,
            description,
            cover_url,
            author_id: currentUser.id
        }]);

    if (error) {
        alert(error.message);
        return;
    }

    document.getElementById("novelTitle").value = "";
    document.getElementById("novelDesc").value = "";
    document.getElementById("coverFile").value = "";

    alert("Novel berhasil ditambahkan");
    loadNovels();
}

async function loadNovels() {
    const { data, error } = await supabaseClient
        .from("novels")
        .select("*")
        .eq("deleted", false)
        .order("created_at", { ascending: false });

    const container = document.getElementById("novelList");
    container.innerHTML = "";

    if (error) {
        container.innerHTML = "<p>Gagal memuat novel</p>";
        return;
    }

    if (!data.length) {
        container.innerHTML = "<p>Belum ada novel</p>";
        return;
    }

    data.forEach(novel => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            ${novel.cover_url ? `<img src="${novel.cover_url}" alt="">` : ""}
            <h3>${novel.title}</h3>
            <p>${novel.description || ""}</p>
            <small>Status: ${novel.status || "ongoing"}</small><br>
            <small>Views: ${novel.views || 0}</small>
        `;

        container.appendChild(div);
    });
}

async function checkSession() {
    const { data } = await supabaseClient.auth.getUser();

    if (data.user) {
        currentUser = data.user;
        await loadProfile();
    } else {
        loadNovels();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkSession();
});
