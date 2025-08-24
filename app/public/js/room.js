const room = document.getElementById("room");
const user_name = document.getElementById("user_name");

document.getElementById("room-post").addEventListener("submit", (e) => {
  e.preventDefault();

  if (user_name.value === "") {
    user_name.value = "user1";
  }

  room.value === "" ? (room.value = 0) : null;

  window.location.href =
    window.location +
    "game?roomId=" +
    Math.floor(room.value) +
    "&name=" +
    user_name.value;
});
