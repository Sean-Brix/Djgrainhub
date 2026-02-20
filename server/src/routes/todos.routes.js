const { Router } = require("express");
const { getTodos, createTodo, updateTodo, deleteTodo } = require("../controllers/todos.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

// GET    /api/todos                — list todos (?completed, ?machineId)
// POST   /api/todos                — create todo from a report
// PATCH  /api/todos/:id            — toggle completed, or update title/description
// DELETE /api/todos/:id            — delete todo

router.get("/", getTodos);
router.post("/", createTodo);
router.patch("/:id", updateTodo);
router.delete("/:id", deleteTodo);

module.exports = { todosRouter: router };
