const contributionForm =
  document.getElementById("contributionForm");

if (contributionForm) {
  contributionForm.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();

      const member_id =
        document.getElementById("memberSelect").value;

      const amount =
        document.getElementById("amount").value;

      const contribution_month =
        document.getElementById("month").value.trim();

      const contribution_year =
        document.getElementById("year").value;

      const button = contributionForm.querySelector("button");

      if (
        !member_id ||
        !amount ||
        !contribution_month ||
        !contribution_year
      ) {
        alert("All contribution fields required");

        return;
      }

      if (Number(amount) <= 0) {
        alert("Amount must be greater than 0");

        return;
      }

      setLoading(button, "Saving...");

      try {
        const data = await apiRequest(
          "/contributions",
          "POST",
          {
            member_id,
            amount,
            contribution_month,
            contribution_year
          }
        );

        alert(data.message || "Contribution saved");

        contributionForm.reset();

        loadContributions();
      } catch (error) {
        console.log(error);
      } finally {
        clearLoading(button);
      }
    }
  );
}

async function loadContributions() {
  try {
    const contributions =
      await apiRequest("/contributions");

    const contributionsContainer =
      document.getElementById(
        "contributionsContainer"
      );

    const totalContributionsElement = document.getElementById(
      "totalContributions"
    );

    let total = 0;

    contributions.forEach(item => {
      total += Number(item.amount);
    });

    if (totalContributionsElement) {
      totalContributionsElement.innerText =
        formatCurrency(total);
    }

    if (!contributionsContainer) return;

    contributionsContainer.innerHTML = "";

    contributions.forEach(item => {
      contributionsContainer.innerHTML += `
        <div class="
            bg-gray-50
            border
            rounded-lg
            p-4
        ">

            <h3 class="font-bold">
                ${item.full_name}
            </h3>

            <p>
                Amount:
                ${formatCurrency(item.amount)}
            </p>

            <p>
                Month:
                ${item.contribution_month}
                ${item.contribution_year}
            </p>

            <p>
                Payment Date:
                ${formatDate(item.payment_date)}
            </p>

        </div>
      `;
    });
  } catch (error) {
    console.log(error);
  }
}
