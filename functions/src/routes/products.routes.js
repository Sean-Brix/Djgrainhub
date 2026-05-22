const { Router } = require("express");
const multer = require("multer");
const {
  getProductsByMachine,
  createProduct,
  updateProduct,
  deleteProduct,
  decrementStock,
  uploadProductImage,
  getProductImage,
} = require("../controllers/products.controller");
const { authenticate } = require("../middleware/auth.middleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are accepted"), false);
    }
    cb(null, true);
  },
});

const router = Router();

// Public — img tags cannot send auth headers
router.get("/:id/image", getProductImage);

router.use(authenticate);
router.patch("/:id", upload.single("image"), updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", decrementStock);
router.post("/:id/image", upload.single("image"), uploadProductImage);

const machineProductsRouter = Router({ mergeParams: true });
machineProductsRouter.use(authenticate);
machineProductsRouter.get("/", getProductsByMachine);
machineProductsRouter.post("/", upload.single("image"), createProduct);

module.exports = { productsRouter: router, machineProductsRouter };
