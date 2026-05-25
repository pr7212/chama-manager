function requireAuth() {
  if (!localStorage.getItem("token")) {
    window.location.href = "login.html";

    return false;
  }

  return true;
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}
