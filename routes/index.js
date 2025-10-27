console.log("✅ index.js cargado correctamente");

document.addEventListener("DOMContentLoaded", () => {
  const btnLogin = document.getElementById("btnLogin");
  const btnRegister = document.getElementById("btnRegister");
  const btnRecover = document.getElementById("btnRecover");
  const btnGuest = document.getElementById("btnGuest");

  if (btnLogin)
    btnLogin.addEventListener("click", () => {
      window.location.href = "./auth/login.html";
    });

  if (btnRegister)
    btnRegister.addEventListener("click", () => {
      window.location.href = "./auth/register.html";
    });

  if (btnRecover)
    btnRecover.addEventListener("click", () => {
      window.location.href = "./auth/recover.html";
    });

  if (btnGuest)
    btnGuest.addEventListener("click", () => {
      alert("Bienvenido como invitado ✈️");
    });
});
