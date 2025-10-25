async function loadParticipantsRound3() {
  try {
    const res = await fetch("/api/participants_round3");
    if (!res.ok) throw new Error("Failed to fetch participants");
    let participants_round3 = await res.json();

    // ===== Sort participants by score descending, then duration ascending =====
    participants_round3.sort((a, b) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;

      const durationA = a.created_at && a.submitted_at
        ? new Date(a.submitted_at) - new Date(a.created_at)
        : Infinity;
      const durationB = b.created_at && b.submitted_at
        ? new Date(b.submitted_at) - new Date(b.created_at)
        : Infinity;

      return durationA - durationB;
    });

    const table = document.getElementById("participants-table");
    table.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Username</th>
        <th>Status</th>
        <th>Score</th>
        <th>Submitted At</th>
        <th>Duration</th>
      </tr>
    `;

    participants_round3.forEach((p) => {
      // ===== Format submission date =====
      let formattedDate = "—";
      if (p.submitted_at) {
        const timestamp = new Date(p.submitted_at);
        if (!isNaN(timestamp)) {
          formattedDate = timestamp.toLocaleString("en-GB", { 
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true
          }).replace(",", "");
        }
      }

      // ===== Calculate duration =====
      let duration = "—";
      if (p.created_at && p.submitted_at) {
        const diffMs = new Date(p.submitted_at) - new Date(p.created_at);
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        duration = `${minutes}m ${seconds}s`;
      }

       // Status badge
      let statusBadge = "";
      let badgeColor = "gray";

      if (p.status) {
        const normalizedStatus = p.status.trim().toLowerCase();
         switch (p.status.toLowerCase()) {
          case "completed":
            statusBadge = "Completed";
            badgeColor = "green";
            break;
          case "disqualified":
            statusBadge = "Disqualified";
            badgeColor = "red";
            break;
          case "timeout":
            statusBadge = "Timeout";
            badgeColor = "orange";
            break;
          default:
            statusBadge = normalizedStatus.charAt(0).toUpperCase() + p.status.slice(1);
        }
      }

      table.innerHTML += `
        <tr>
          <td>${p.id}</td>
          <td>${p.username}</td>
          <td><span style="color:white; background-color:${badgeColor}; padding:2px 6px; border-radius:4px;">${statusBadge}</span></td>
          <td>${p.score ?? 0}</td>
          <td>${formattedDate}</td>
          <td>${duration}</td>
        </tr>
      `;
    });

  } catch (error) {
    console.error("Failed to load participants:", error);
    alert("Failed to load Round 3 participants data");
  }
}

// ===== INITIAL LOAD =====
loadParticipantsRound3();
