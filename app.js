const SUPABASE_URL = "https://lyhqlhqrazxhjpxxllqg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aHFsaHFyYXp4aGpweHhsbHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTk0NTMsImV4cCI6MjA5MjEzNTQ1M30.r4PXoKM15VBItcKH7VhmabzwwXPSVy9uN3nGB8b9rCQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ambil id chapter aktif
const chapterId = localStorage.getItem("currentChapterId") || "chapter-demo";

async function loadComments() {
    const { data, error } = await supabaseClient
        .from("comments")
        .select(`
            id,
            message,
            created_at,
            profiles(username)
        `)
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Load comment error:", error);
        return;
    }

    const commentList = document.getElementById("commentList");
    commentList.innerHTML = "";

    data.forEach(comment => {
        const div = document.createElement("div");
        div.className = "comment-box";
        div.innerHTML = `
            <b>${comment.profiles?.username || "User"}</b>
            <p>${comment.message}</p>
            <small>${new Date(comment.created_at).toLocaleString()}</small>
        `;
        commentList.appendChild(div);
    });
}

async function sendComment() {
    const input = document.getElementById("commentInput");
    const message = input.value.trim();

    if (!message) {
        alert("Komentar kosong");
        return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert("Silakan login dulu");
        return;
    }

    const { error } = await supabaseClient
        .from("comments")
        .insert([
            {
                chapter_id: chapterId,
                user_id: user.id,
                message: message
            }
        ]);

    if (error) {
        console.error("Insert error:", error);
        alert("Gagal kirim komentar");
        return;
    }

    input.value = "";
    loadComments();
}

// realtime update komentar
supabaseClient
    .channel("comments-channel")
    .on(
        "postgres_changes",
        {
            event: "*",
            schema: "public",
            table: "comments",
            filter: `chapter_id=eq.${chapterId}`
        },
        () => {
            loadComments();
        }
    )
    .subscribe();

window.onload = function () {
    loadComments();
};
