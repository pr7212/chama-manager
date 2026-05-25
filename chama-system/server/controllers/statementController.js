const pool = require("../config/db");
const PDFDocument = require("pdfkit");

// GET MEMBER STATEMENT
exports.getMemberStatement = async (req, res) => {

    try {

        const memberId = req.params.id;

        // Member details
        const memberResult = await pool.query(
            `
            SELECT * FROM members
            WHERE id = $1
            `,
            [memberId]
        );

        // Contributions
        const contributionsResult = await pool.query(
            `
            SELECT *
            FROM contributions
            WHERE member_id = $1
            ORDER BY created_at DESC
            `,
            [memberId]
        );

        // Loans
        const loansResult = await pool.query(
            `
            SELECT *
            FROM loans
            WHERE member_id = $1
            ORDER BY created_at DESC
            `,
            [memberId]
        );

        const member =
            memberResult.rows[0];

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        const contributions =
            contributionsResult.rows;

        const loans =
            loansResult.rows;

        // Calculate totals
        const totalContributions =
            contributions.reduce(
                (sum, item) =>
                    sum + Number(item.amount),
                0
            );

        const activeLoans =
            loans.filter(
                loan => loan.status === "active"
            );

        res.status(200).json({

            member,

            contributions,

            loans,

            summary: {
                totalContributions,
                activeLoans: activeLoans.length
            }

        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Server error"
        });

    }

};

exports.generateStatementPDF =
    async (req, res) => {

    try {

        const memberId = req.params.id;

        // Fetch member
        const memberResult = await pool.query(
            `
            SELECT * FROM members
            WHERE id = $1
            `,
            [memberId]
        );

        const member =
            memberResult.rows[0];

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        // Contributions
        const contributionsResult =
            await pool.query(
                `
                SELECT *
                FROM contributions
                WHERE member_id = $1
                `,
                [memberId]
            );

        // Loans
        const loansResult =
            await pool.query(
                `
                SELECT *
                FROM loans
                WHERE member_id = $1
                `,
                [memberId]
            );

        // Create PDF
        const doc = new PDFDocument();

        // Response headers
        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=statement_${member.id}.pdf`
        );

        doc.pipe(res);

        // Title
        doc.fontSize(20)
            .text(
                "Chama Member Statement",
                {
                    align: "center"
                }
            );

        doc.moveDown();

        // Member Info
        doc.fontSize(14)
            .text(
                `Name: ${member.full_name}`
            );

        doc.text(
            `Phone: ${member.phone}`
        );

        doc.text(
            `Join Date: ${member.join_date || member.created_at}`
        );

        doc.moveDown();

        // Contributions
        doc.fontSize(16)
            .text("Contributions");

        contributionsResult.rows.forEach(
            contribution => {

                doc.fontSize(12)
                    .text(
                        `
                        ${contribution.contribution_month}
                        ${contribution.contribution_year}
                        - KES ${contribution.amount}
                        `
                    );

            }
        );

        doc.moveDown();

        // Loans
        doc.fontSize(16)
            .text("Loans");

        loansResult.rows.forEach(loan => {

            doc.fontSize(12)
                .text(
                    `
                    Loan:
                    KES ${loan.amount}
                    | Balance:
                    KES ${loan.remaining_balance}
                    | Status:
                    ${loan.status}
                    `
                );

        });

        doc.moveDown();

        // Totals
        const totalContributions =
            contributionsResult.rows.reduce(
                (sum, item) =>
                    sum + Number(item.amount),
                0
            );

        doc.fontSize(14)
            .text(
                `Total Contributions:
                 KES ${totalContributions}`
            );

        doc.end();

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Server error"
        });

    }

};
