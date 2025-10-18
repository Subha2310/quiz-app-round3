// admin.js

async function loadParticipants() {
  try {
    const res = await fetch("/api/participants");
    if (!res.ok) throw new Error("Failed to fetch participants");
    const participants = await res.json();

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

participants.forEach((p) => {
  // Format date safely
  let formattedDate = "—";
  let duration = "—";

  if (p.submitted_at) {
    const timestamp = new Date(p.submitted_at); // now valid
    if (!isNaN(timestamp)) {
      const options = {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      };
      formattedDate = submitted
        .toLocaleString("en-GB", options)
        .replace(",", "");
    }
  }
 // ===== Calculate duration =====
      if (p.created_at && p.submitted_at) {
        const created = new Date(p.created_at);
        const submitted = new Date(p.submitted_at);
        if (!isNaN(created) && !isNaN(submitted)) {
          const diffMs = submitted - created;
          const minutes = Math.floor(diffMs / 60000);
          const seconds = Math.floor((diffMs % 60000) / 1000);
          duration = `${minutes}m ${seconds}s`;
        }
      }

  // Status badge
  let statusBadge = "";
  let badgeColor = "gray";

  if (p.status) {
     const normalizedStatus = p.status.trim().toLowerCase();
 
    switch (normalizedStatus) {
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
    alert("Failed to load participants data");
  }
}

loadParticipants();
