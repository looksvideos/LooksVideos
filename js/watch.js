import { supabase } from "./supabase-config.js";

const videoId = new URLSearchParams(location.search).get("id");

const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[character]));

const $ = id => document.getElementById(id);


async function loadComments() {

    const commentsBox = $("comments");

    const { data, error } = await supabase
        .from("comments")
        .select("body, created_at, profiles(username, avatar_path)")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false });

    if (error) {
        commentsBox.textContent = error.message;
        return;
    }

    if (!data || data.length === 0) {
        commentsBox.innerHTML = "<p>No comments yet.</p>";
        return;
    }

    commentsBox.innerHTML = data.map(comment => {

        let avatar = "";

        if (comment.profiles?.avatar_path) {
            avatar = supabase.storage
                .from("profiles")
                .getPublicUrl(comment.profiles.avatar_path)
                .data.publicUrl;
        }

        return `
            <article>

                ${
                    avatar
                    ? `<img src="${esc(avatar)}" width="40" height="40" alt="Profile picture">`
                    : ""
                }

                <strong>
                    ${esc(comment.profiles?.username || "Unknown")}
                </strong>

                <p>${esc(comment.body)}</p>

            </article>

            <hr>
        `;

    }).join("");
}


async function loadRelatedVideos() {

    const box = $("related-videos");

    const { data, error } = await supabase
        .from("videos")
        .select("id, title, views, uploader_id, profiles(username)")
        .eq("visibility", "public")
        .neq("id", videoId)
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        box.textContent = error.message;
        return;
    }

    if (!data || data.length === 0) {
        box.innerHTML = "<p>No other videos.</p>";
        return;
    }

    box.innerHTML = data.map(video => `
        <article>

            <a href="watch.html?id=${encodeURIComponent(video.id)}">
                ${esc(video.title)}
            </a>

            <p>
                Uploaded by:
                ${esc(video.profiles?.username || "Unknown")}
            </p>

            <p>
                ${Number(video.views)} views
            </p>

        </article>

        <hr>
    `).join("");
}


async function main() {

    if (!videoId) {
        document.body.textContent = "Missing video ID.";
        return;
    }


    const {
        data: { user }
    } = await supabase.auth.getUser();


    const { data: video, error } = await supabase
        .from("videos")
        .select(`
            *,
            profiles(
                username,
                avatar_path
            )
        `)
        .eq("id", videoId)
        .single();


    if (error || !video) {
        document.body.textContent = "Video not found.";
        console.error(error);
        return;
    }


    if (
        video.visibility === "private" &&
        video.uploader_id !== user?.id
    ) {
        document.body.textContent = "This video is private.";
        return;
    }


    await supabase.rpc(
        "increment_video_views",
        {
            video_id_input: videoId
        }
    );


    const {
        data: file
    } = supabase.storage
        .from("videos")
        .getPublicUrl(video.storage_path);


    $("video-title").textContent = video.title;

    $("description").textContent = video.description || "";

    $("views").textContent =
        "Views: " + (Number(video.views) + 1);


    const username =
        video.profiles?.username || "Unknown";


    $("uploaded-by").textContent = username;

    $("uploader-username").textContent = username;

    $("uploader-username").href =
        "profile.html?id=" +
        encodeURIComponent(video.uploader_id);


    if (video.profiles?.avatar_path) {

        const avatar =
            supabase.storage
                .from("profiles")
                .getPublicUrl(video.profiles.avatar_path)
                .data.publicUrl;

        $("uploader-avatar").src = avatar;

    } else {

        $("uploader-avatar").alt =
            "No profile picture";

    }


    const isSwf =
        (video.mime_type || "").includes("shockwave-flash") ||
        video.storage_path.toLowerCase().endsWith(".swf");


    if (isSwf) {

        const link = document.createElement("a");

        link.href =
            "ruffle.html?url=" +
            encodeURIComponent(file.publicUrl);

        link.textContent = "Play with Ruffle";

        $("video-player").appendChild(link);

    } else {

        const player = document.createElement("video");

        player.controls = true;
        player.width = 640;
        player.src = file.publicUrl;

        $("video-player").appendChild(player);

    }


    await loadComments();

    await loadRelatedVideos();


    $("comment-form").addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            if (!user) {
                alert("Log in to comment.");
                return;
            }

            const body =
                $("comment-text").value.trim();

            if (!body) {
                return;
            }


            const { error } = await supabase
                .from("comments")
                .insert({
                    video_id: videoId,
                    user_id: user.id,
                    body: body
                });


            if (error) {

                alert(error.message);
                return;

            }


            $("comment-text").value = "";

            await loadComments();

        }
    );

}


main();
