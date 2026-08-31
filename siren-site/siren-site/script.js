const playButton = document.querySelector("#record-play");
const disc = document.querySelector("#disc");

playButton?.addEventListener("click", () => {
  disc?.classList.toggle("is-spinning");
});
