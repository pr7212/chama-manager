const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;
    const button = loginForm.querySelector("button");

    button.innerText = "Logging in...";
    button.disabled = true;

    try {

        const response = await fetch(
            `${CONFIG.API_URL}/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    phone,
                    password
                })
            }
        );

        const data = await response.json();

        console.log(data);

        if (response.ok) {

            localStorage.setItem("token", data.token);

            alert("Login successful");

            window.location.href = "dashboard.html";

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.log(error);

    } finally {

        button.innerText = "Login";
        button.disabled = false;

    }

});
