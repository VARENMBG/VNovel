const SUPABASE_URL = "https://lyhqlhqrazxhjpxxllqg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aHFsaHFyYXp4aGpweHhsbHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTk0NTMsImV4cCI6MjA5MjEzNTQ1M30.r4PXoKM15VBItcKH7VhmabzwwXPSVy9uN3nGB8b9rCQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentNovel = null;

window.onload = async () => {
  await checkSession();
  loadNovels();
};

async function checkSession(){
  const { data } = await supabaseClient.auth.getSession();
  if(data.session){
    currentUser = data.session.user;
    document.getElementById("userBox").innerHTML =
      `<button onclick="logout()">Logout</button>`;
  }
}

async function register(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const username = document.getElementById("username").value;

  const { data,error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if(error) return alert(error.message);

  await supabaseClient.from("profiles").insert({
    id: data.user.id,
    username: username,
    role: "member"
  });

  alert("Register berhasil");
}

async function login(){
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  });

  if(error) return alert(error.message);

  location.reload();
}

async function logout(){
  await supabaseClient.auth.signOut();
  location.reload();
}

async function uploadCover(file){
  const fileName = Date.now() + "_" + file.name;

  const { error } = await supabaseClient.storage
    .from("novel-covers")
    .upload(fileName, file);

  if(error){
    alert(error.message);
    return null;
  }

  const { data } = supabaseClient.storage
    .from("novel-covers")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

async function addNovel(){
  if(!currentUser) return alert("Login dulu");

  const title = document.getElementById("novelTitle").value;
  const description = document.getElementById("novelDesc").value;
  const file = document.getElementById("coverFile").files[0];

  let cover_url = "";
  if(file){
    cover_url = await uploadCover(file);
  }

  const { error } = await supabaseClient.from("novels").insert({
    title,
    description,
    cover_url,
    author_id: currentUser.id
  });

  if(error) return alert(error.message);

  loadNovels();
}

async function loadNovels(){
  const { data } = await supabaseClient
    .from("novels")
    .select("*")
    .order("created_at", { ascending:false });

  const box = document.getElementById("novelList");
  box.innerHTML = "";

  data.forEach(novel=>{
    box.innerHTML += `
      <div class="novel-card">
        <img src="${novel.cover_url || ''}">
        <h3>${novel.title}</h3>
        <p>${novel.description}</p>
        <button onclick="openNovel('${novel.id}')">Buka</button>
      </div>
    `;
  });
}

async function openNovel(id){
  currentNovel = id;
  loadChapters();
  loadComments();
}

async function addChapter(){
  if(!currentNovel) return alert("Pilih novel dulu");

  await supabaseClient.from("chapters").insert({
    novel_id: currentNovel,
    title: document.getElementById("chapterTitle").value,
    content: document.getElementById("chapterContent").value
  });

  loadChapters();
}

async function loadChapters(){
  const { data } = await supabaseClient
    .from("chapters")
    .select("*")
    .eq("novel_id", currentNovel)
    .order("created_at");

  const box = document.getElementById("chapterList");
  box.innerHTML = "";

  data.forEach(ch=>{
    box.innerHTML += `
      <div class="chapter-item">
        <h3>${ch.title}</h3>
        <pre>${ch.content}</pre>
      </div>
    `;
  });
}

async function addComment(){
  if(!currentUser) return alert("Login dulu");

  await supabaseClient.from("comments").insert({
    novel_id: currentNovel,
    user_id: currentUser.id,
    content: document.getElementById("commentText").value
  });

  loadComments();
}

async function loadComments(){
  const { data } = await supabaseClient
    .from("comments")
    .select("*, profiles(username)")
    .eq("novel_id", currentNovel)
    .order("created_at");

  const box = document.getElementById("commentList");
  box.innerHTML = "";

  data.forEach(c=>{
    box.innerHTML += `
      <div class="comment">
        <b>${c.profiles?.username || 'User'}</b>
        <p>${c.content}</p>
      </div>
    `;
  });
}
