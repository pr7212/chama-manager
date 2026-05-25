const API_URL =
    CONFIG.API_URL;

const token =
    localStorage.getItem("token");

async function apiRequest(
    endpoint,
    method = "GET",
    body = null
) {

    const options = {

        method,

        headers: {
            "Content-Type":
                "application/json",

            Authorization:
                `Bearer ${token}`
        }

    };

    if (body) {

        options.body =
            JSON.stringify(body);

    }

    const response =
        await fetch(
            `${API_URL}${endpoint}`,
            options
        );

    return response.json();

}
