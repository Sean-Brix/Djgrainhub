const { Router } = require("express");
const { getTodos, createTodo, updateTodo, deleteTodo } = require("../controllers/todos.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

router.get("/", getTodos);
router.post("/", createTodo);
router.patch("/:id", updateTodo);
router.delete("/:id", deleteTodo);

module.exports = { todosRouter: router };
