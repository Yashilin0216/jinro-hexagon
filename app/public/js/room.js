const room = document.getElementById("room");
const user_name = document.getElementById("user_name");
const move_condition = document.getElementById("move_conditions");
const role_condition = document.getElementById("role_conditions");

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
    user_name.value +
    "&move_condition=" + 
    move_condition.value +
    "&role_condition=" + 
    role_condition.value;
});
