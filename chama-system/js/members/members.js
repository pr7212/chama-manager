function setLoading(button, text) {
  if (!button) return;

  button.dataset.originalText = button.innerText;
  button.innerText = text;
  button.disabled = true;
}

function clearLoading(button) {
  if (!button) return;

  button.innerText = button.dataset.originalText || "Save";
  button.disabled = false;
}

const memberForm = document.getElementById("memberForm");

if (memberForm) {
  memberForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const full_name = document.getElementById("full_name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const national_id = document.getElementById("national_id").value.trim();
    const button = memberForm.querySelector("button");

    if (
      !full_name ||
      !phone ||
      !national_id
    ) {
      alert("All fields are required");

      return;
    }

    setLoading(button, "Saving...");

    try {
      const data = await apiRequest(
        "/members",
        "POST",
        {
          full_name,
          phone,
          national_id
        }
      );

      alert(data.message || "Member saved");

      memberForm.reset();
      loadMembers();
    } catch (error) {
      console.log(error);
    } finally {
      clearLoading(button);
    }
  });
}

async function loadMembers() {
  try {
    const data = await apiRequest("/members");
    const members = data.members || [];

    const membersContainer = document.getElementById("membersContainer");
    const totalMembers = document.getElementById("totalMembers");
    const memberSelect = document.getElementById("memberSelect");

    if (totalMembers) {
      totalMembers.innerText = members.length;
    }

    if (memberSelect) {
      memberSelect.innerHTML = `
        <option value="">
            Select Member
        </option>
      `;

      members.forEach((member) => {
        memberSelect.innerHTML += `
          <option value="${member.id}">
            ${member.full_name}
          </option>
        `;
      });
    }

    if (!membersContainer) return;

    membersContainer.innerHTML = "";

    members.forEach((member) => {
      membersContainer.innerHTML += `
        <div class="
            bg-gray-50
            border
            rounded-lg
            p-4
        ">

            <h3 class="
                text-lg
                font-bold
            ">
                ${member.full_name}
            </h3>

            <p class="text-gray-600">
                ${member.phone}
            </p>

            <p class="text-gray-600">
                ID:
                ${member.national_id || ""}
            </p>

            <div class="
                mt-4
                flex
                gap-2
            ">

                <button
                    onclick="downloadPDF(${member.id})"
                    class="
                        bg-blue-500
                        text-white
                        px-3
                        py-2
                        rounded
                    "
                >
                    Statement
                </button>

            </div>

        </div>
      `;
    });
  } catch (error) {
    console.log(error);
  }
}

async function downloadPDF(memberId) {
  try {
    const response = await fetch(
      `${API_URL}/statements/pdf/${memberId}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    const blob =
      await response.blob();

    const url =
      window.URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      `statement_${memberId}.pdf`;

    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.log(error);
  }
}
