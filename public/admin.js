async function loadParticipants() {
  try {
    const res = await fetch("/api/participants");
    const participants = await res.json();

    let table = document.getElementById("participants-table");
    table.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Username</th>
        <th>Status</th>
        <th>Score</th>
        <th>Submitted At</th>
      </tr>
    `;

    participants.forEach((p) => {
      // Format the date & time if it exists
      let formattedDate = "—";
      if (p.submitted_at) {
        const date = new Date(p.submitted_at);
        const options = {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        };
        formattedDate = date.toLocaleString("en-GB", options).replace(",", "");
      }

      // Capitalize status for better display
      const statusDisplay =
        p.status.charAt(0).toUpperCase() + p.status.slice(1);

      table.innerHTML += `
        <tr>
          <td>${p.id}</td>
          <td>${p.username}</td>
          <td>${statusDisplay}</td>
          <td>${p.score ?? 0}</td>
          <td>${formattedDate}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Failed to load participants:", error);
    alert("Failed to load participants data");
  }
}

loadParticipants();
