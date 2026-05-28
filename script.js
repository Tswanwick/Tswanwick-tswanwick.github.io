const taskInput = document.getElementById("taskInput");
const addBtn    = document.getElementById("addBtn");
const taskList  = document.getElementById("taskList");

addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

// Load tasks on page load
async function loadTasks() {
  const res   = await fetch("/tasks");
  const tasks = await res.json();
  taskList.innerHTML = "";
  tasks.forEach(renderTask);
}
loadTasks();

// Add task via server
async function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;
  const res  = await fetch("/tasks", {          // ✅ fixed
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ text }),
  });
  const task = await res.json();
  renderTask(task);
  taskInput.value = "";
}

// Render a task
function renderTask(task) {
  const li = document.createElement("li");
  li.textContent = task.text;
  li.dataset.id = task.id;
  if (task.completed) li.classList.add("completed");
  li.addEventListener("click", async () => {
    const res     = await fetch(`/tasks/${task.id}`, {   // ✅ fixed
      method: "PATCH",
    });
    const updated = await res.json();
    li.classList.toggle("completed", updated.completed);
  });
  taskList.appendChild(li);
}
