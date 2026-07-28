import { Router, type IRouter } from "express";
import v1Router from "./v1";

const router: IRouter = Router();

router.use("/v1", v1Router);

export default router;
