const loanForm =
  document.getElementById("loanForm");

if (loanForm) {
  loanForm.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();

      const member_id =
        document.getElementById(
          "loan_member_id"
        ).value;

      const amount =
        document.getElementById(
          "loan_amount"
        ).value;

      const interest_rate =
        document.getElementById(
          "interest_rate"
        ).value;

      const due_date =
        document.getElementById(
          "due_date"
        ).value;

      const button = loanForm.querySelector("button");

      if (
        !member_id ||
        !amount ||
        !interest_rate ||
        !due_date
      ) {
        alert("All loan fields required");

        return;
      }

      if (Number(amount) <= 0) {
        alert("Loan amount invalid");

        return;
      }

      if (Number(interest_rate) < 0) {
        alert("Interest rate invalid");

        return;
      }

      setLoading(button, "Saving...");

      try {
        const data =
          await apiRequest(
            "/loans",
            "POST",
            {
              member_id,
              amount,
              interest_rate,
              due_date
            }
          );

        alert(data.message || "Loan saved");

        loanForm.reset();

        loadLoans();
      } catch (error) {
        console.log(error);
      } finally {
        clearLoading(button);
      }
    }
  );
}

async function loadLoans() {
  try {
    const loans =
      await apiRequest("/loans");

    const loansContainer =
      document.getElementById(
        "loansContainer"
      );

    const activeLoansElement =
      document.getElementById("activeLoans");

    let activeCount = 0;

    loans.forEach(loan => {
      if (loan.status === "active") {
        activeCount++;
      }
    });

    if (activeLoansElement) {
      activeLoansElement.innerText = activeCount;
    }

    if (!loansContainer) return;

    loansContainer.innerHTML = "";

    loans.forEach(loan => {
      loansContainer.innerHTML += `
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
                ${loan.full_name}
            </h3>

            <p>
                Loan:
                ${formatCurrency(loan.amount)}
            </p>

            <p>
                Interest:
                ${loan.interest_rate}%
            </p>

            <p>
                Total:
                ${formatCurrency(loan.total_amount)}
            </p>

            <p>
                Paid:
                ${formatCurrency(loan.amount_paid)}
            </p>

            <p>
                Balance:
                ${formatCurrency(loan.remaining_balance)}
            </p>

            <p>
                Status:
                ${loan.status}
            </p>

        </div>
      `;
    });
  } catch (error) {
    console.log(error);
  }
}
