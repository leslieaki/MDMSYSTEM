import express, { Router } from "express";
import type { ErrorRequestHandler } from "express";
import { ClearMissingPartDrawingFileUseCase } from "../../application/useCases/ClearMissingPartDrawingFileUseCase";
import { ClearOperationLogsUseCase } from "../../application/useCases/ClearOperationLogsUseCase";
import { ChangeAuthUserPasswordUseCase } from "../../application/useCases/ChangeAuthUserPasswordUseCase";
import { CreateAuthUserUseCase } from "../../application/useCases/CreateAuthUserUseCase";
import { CreateOperationLogUseCase } from "../../application/useCases/CreateOperationLogUseCase";
import { CreatePartUseCase } from "../../application/useCases/CreatePartUseCase";
import { CreatePartNomenclatureUseCase } from "../../application/useCases/CreatePartNomenclatureUseCase";
import { CreatePurchaseUseCase } from "../../application/useCases/CreatePurchaseUseCase";
import { CreateReferenceItemUseCase } from "../../application/useCases/CreateReferenceItemUseCase";
import { DeletePartDrawingFileUseCase } from "../../application/useCases/DeletePartDrawingFileUseCase";
import { DeletePartNomenclatureUseCase } from "../../application/useCases/DeletePartNomenclatureUseCase";
import { DeleteReferenceItemUseCase } from "../../application/useCases/DeleteReferenceItemUseCase";
import { GetAuthUsersUseCase } from "../../application/useCases/GetAuthUsersUseCase";
import { GetOperationLogsUseCase } from "../../application/useCases/GetOperationLogsUseCase";
import { GetPartDrawingFileUseCase } from "../../application/useCases/GetPartDrawingFileUseCase";
import { GetPartDrawingFilesUseCase } from "../../application/useCases/GetPartDrawingFilesUseCase";
import { GetPartDrawingStorageIssuesUseCase } from "../../application/useCases/GetPartDrawingStorageIssuesUseCase";
import { GetPartNomenclatureUseCase } from "../../application/useCases/GetPartNomenclatureUseCase";
import { GetPartsUseCase } from "../../application/useCases/GetPartsUseCase";
import { GetPurchasesUseCase } from "../../application/useCases/GetPurchasesUseCase";
import { GetReferenceItemsUseCase } from "../../application/useCases/GetReferenceItemsUseCase";
import { GetStockReportUseCase } from "../../application/useCases/GetStockReportUseCase";
import { LoginUseCase } from "../../application/useCases/LoginUseCase";
import { UploadPartDrawingFileUseCase } from "../../application/useCases/UploadPartDrawingFileUseCase";
import { UpdateAuthUserUseCase } from "../../application/useCases/UpdateAuthUserUseCase";
import { UpdatePartUseCase } from "../../application/useCases/UpdatePartUseCase";
import { UpdatePartNomenclatureUseCase } from "../../application/useCases/UpdatePartNomenclatureUseCase";
import { UpdateReferenceItemUseCase } from "../../application/useCases/UpdateReferenceItemUseCase";
import { postgresPool } from "../../infrastructure/database/PostgresConnection";
import { PostgresAuthUserRepository } from "../../infrastructure/repositories/PostgresAuthUserRepository";
import { PostgresOperationLogRepository } from "../../infrastructure/repositories/PostgresOperationLogRepository";
import { PostgresPartDrawingFileRepository } from "../../infrastructure/repositories/PostgresPartDrawingFileRepository";
import { PostgresPartNomenclatureRepository } from "../../infrastructure/repositories/PostgresPartNomenclatureRepository";
import { PostgresPartRepository } from "../../infrastructure/repositories/PostgresPartRepository";
import { PostgresPurchaseRepository } from "../../infrastructure/repositories/PostgresPurchaseRepository";
import { PostgresReferenceRepository } from "../../infrastructure/repositories/PostgresReferenceRepository";
import { PostgresStockReportRepository } from "../../infrastructure/repositories/PostgresStockReportRepository";
import { LocalDrawingFileStorage } from "../../infrastructure/storage/LocalDrawingFileStorage";
import { createAuditLogMiddleware } from "./audit";
import { createAuthMiddleware, requireRole } from "./auth";
import { AuthController } from "./controllers/AuthController";
import { AuthUsersController } from "./controllers/AuthUsersController";
import { OperationLogsController } from "./controllers/OperationLogsController";
import { PartDrawingFilesController } from "./controllers/PartDrawingFilesController";
import { PartNomenclatureController } from "./controllers/PartNomenclatureController";
import { PartsController } from "./controllers/PartsController";
import { PurchasesController } from "./controllers/PurchasesController";
import { ReferencesController } from "./controllers/ReferencesController";
import { ReportsController } from "./controllers/ReportsController";

export function createApiRouter(): Router {
  const router = Router();

  const authUserRepository = new PostgresAuthUserRepository();
  const partRepository = new PostgresPartRepository();
  const partNomenclatureRepository = new PostgresPartNomenclatureRepository();
  const purchaseRepository = new PostgresPurchaseRepository();
  const referenceRepository = new PostgresReferenceRepository();
  const partDrawingFileRepository = new PostgresPartDrawingFileRepository();
  const operationLogRepository = new PostgresOperationLogRepository();
  const stockReportRepository = new PostgresStockReportRepository();
  const drawingFileStorage = new LocalDrawingFileStorage();

  const authenticate = createAuthMiddleware(authUserRepository);
  const requireAdmin = requireRole("superadmin", "admin");
  const createOperationLogUseCase = new CreateOperationLogUseCase(
    operationLogRepository,
  );
  const audit = (action: string, section: string, description: string) =>
    createAuditLogMiddleware(createOperationLogUseCase, {
      action,
      section,
      description,
    });

  const authController = new AuthController(
    new LoginUseCase(authUserRepository),
  );

  const authUsersController = new AuthUsersController(
    new GetAuthUsersUseCase(authUserRepository),
    new CreateAuthUserUseCase(authUserRepository),
    new UpdateAuthUserUseCase(authUserRepository),
    new ChangeAuthUserPasswordUseCase(authUserRepository),
  );

  const partsController = new PartsController(
    new GetPartsUseCase(partRepository),
    new CreatePartUseCase(
      partRepository,
      partNomenclatureRepository,
      referenceRepository,
    ),
    new UpdatePartUseCase(
      partRepository,
      partNomenclatureRepository,
      referenceRepository,
    ),
  );

  const partNomenclatureController = new PartNomenclatureController(
    new GetPartNomenclatureUseCase(partNomenclatureRepository),
    new CreatePartNomenclatureUseCase(
      partNomenclatureRepository,
      referenceRepository,
    ),
    new UpdatePartNomenclatureUseCase(
      partNomenclatureRepository,
      referenceRepository,
    ),
    new DeletePartNomenclatureUseCase(partNomenclatureRepository),
  );

  const purchasesController = new PurchasesController(
    new GetPurchasesUseCase(purchaseRepository),
    new CreatePurchaseUseCase(partRepository, purchaseRepository),
  );

  const referencesController = new ReferencesController(
    new GetReferenceItemsUseCase(referenceRepository),
    new CreateReferenceItemUseCase(referenceRepository),
    new UpdateReferenceItemUseCase(referenceRepository),
    new DeleteReferenceItemUseCase(referenceRepository),
  );

  const reportsController = new ReportsController(
    new GetStockReportUseCase(stockReportRepository),
  );

  const operationLogsController = new OperationLogsController(
    new GetOperationLogsUseCase(operationLogRepository),
    createOperationLogUseCase,
    new ClearOperationLogsUseCase(operationLogRepository),
  );

  const partDrawingFilesController = new PartDrawingFilesController(
    new GetPartDrawingFilesUseCase(partDrawingFileRepository),
    new GetPartDrawingFileUseCase(
      partRepository,
      partDrawingFileRepository,
      drawingFileStorage,
    ),
    new UploadPartDrawingFileUseCase(
      partRepository,
      partDrawingFileRepository,
      drawingFileStorage,
    ),
    new DeletePartDrawingFileUseCase(
      partRepository,
      partDrawingFileRepository,
      drawingFileStorage,
    ),
    new GetPartDrawingStorageIssuesUseCase(
      partDrawingFileRepository,
      drawingFileStorage,
    ),
    new ClearMissingPartDrawingFileUseCase(
      partRepository,
      partDrawingFileRepository,
      drawingFileStorage,
    ),
  );

  const drawingFileUploadMiddleware = express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    limit: "25mb",
  });

  const drawingFileUploadErrorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    next,
  ) => {
    if (error instanceof Error && error.name === "PayloadTooLargeError") {
      response.status(413).json({
        message: "Размер изображения не должен превышать 25 МБ",
      });
      return;
    }

    next(error);
  };

  router.get("/health", async (_request, response) => {
    try {
      await postgresPool.query("SELECT 1");

      response.json({
        status: "ok",
        service: "mdm-backend",
        database: "connected",
      });
    } catch (error) {
      console.error("PostgreSQL connection error:", error);

      response.status(500).json({
        status: "error",
        service: "mdm-backend",
        database: "disconnected",
        message:
          error instanceof Error ? error.message : "Database connection failed",
      });
    }
  });

  router.post("/auth/login", authController.login);
  router.get("/auth/me", authenticate, authController.me);

  router.get(
    "/auth/users",
    authenticate,
    requireAdmin,
    authUsersController.getAll,
  );
  router.post(
    "/auth/users",
    authenticate,
    requireAdmin,
    audit(
      "Создание пользователя",
      "Пользователи",
      "Создана учетная запись пользователя",
    ),
    authUsersController.create,
  );
  router.patch(
    "/auth/users/:id",
    authenticate,
    requireAdmin,
    audit(
      "Редактирование пользователя",
      "Пользователи",
      "Изменена учетная запись пользователя",
    ),
    authUsersController.update,
  );
  router.patch(
    "/auth/users/:id/password",
    authenticate,
    requireAdmin,
    audit(
      "Смена пароля пользователя",
      "Пользователи",
      "Изменен пароль учетной записи",
    ),
    authUsersController.changePassword,
  );

  router.get("/reports/stock", authenticate, reportsController.getStockReport);

  router.get("/operation-logs", authenticate, operationLogsController.getAll);
  router.post("/operation-logs", authenticate, operationLogsController.create);
  router.delete(
    "/operation-logs",
    authenticate,
    requireAdmin,
    operationLogsController.clear,
  );

  router.get("/references/:kind", authenticate, referencesController.getAll);
  router.post(
    "/references/:kind",
    authenticate,
    requireAdmin,
    audit(
      "Создание записи справочника",
      "Справочники",
      "Создана запись справочника",
    ),
    referencesController.create,
  );
  router.patch(
    "/references/:kind/:id",
    authenticate,
    requireAdmin,
    audit(
      "Редактирование записи справочника",
      "Справочники",
      "Изменена запись справочника",
    ),
    referencesController.update,
  );
  router.delete(
    "/references/:kind/:id",
    authenticate,
    requireAdmin,
    audit(
      "Удаление записи справочника",
      "Справочники",
      "Удалена запись справочника",
    ),
    referencesController.remove,
  );

  router.get(
    "/part-nomenclature",
    authenticate,
    partNomenclatureController.getAll,
  );
  router.post(
    "/part-nomenclature",
    authenticate,
    requireAdmin,
    audit(
      "Создание номенклатуры",
      "Номенклатура",
      "Создана позиция номенклатуры",
    ),
    partNomenclatureController.create,
  );
  router.patch(
    "/part-nomenclature/:id",
    authenticate,
    requireAdmin,
    audit(
      "Редактирование номенклатуры",
      "Номенклатура",
      "Изменена позиция номенклатуры",
    ),
    partNomenclatureController.update,
  );
  router.delete(
    "/part-nomenclature/:id",
    authenticate,
    requireAdmin,
    audit(
      "Удаление номенклатуры",
      "Номенклатура",
      "Удалена позиция номенклатуры",
    ),
    partNomenclatureController.remove,
  );

  router.get(
    "/parts/drawing-files",
    authenticate,
    partDrawingFilesController.getAll,
  );
  router.get(
    "/parts/drawing-storage-issues",
    authenticate,
    requireAdmin,
    partDrawingFilesController.getStorageIssues,
  );
  router.delete(
    "/parts/:id/drawing-file/missing-record",
    authenticate,
    requireAdmin,
    audit(
      "Очистка записи чертежа",
      "Чертежи",
      "Удалена битая запись файла чертежа"
    ),
    partDrawingFilesController.clearMissingRecord,
  );
  router.get(
    "/parts/drawing-images",
    authenticate,
    partDrawingFilesController.getLegacyImageMap,
  );
  router.get(
    "/parts/:id/drawing-file",
    authenticate,
    partDrawingFilesController.getFile,
  );
  router.get(
    "/parts/:id/drawing-image",
    authenticate,
    partDrawingFilesController.getFile,
  );

  router.put(
    "/parts/:id/drawing-file",
    authenticate,
    requireAdmin,
    drawingFileUploadMiddleware,
    drawingFileUploadErrorHandler,
    audit("Загрузка чертежа", "Чертежи", "Загружен файл чертежа"),
    partDrawingFilesController.upload,
  );

  router.put(
    "/parts/:id/drawing-image",
    authenticate,
    requireAdmin,
    drawingFileUploadMiddleware,
    drawingFileUploadErrorHandler,
    audit("Загрузка чертежа", "Чертежи", "Загружен файл чертежа"),
    partDrawingFilesController.upload,
  );

  router.delete(
    "/parts/:id/drawing-file",
    authenticate,
    requireAdmin,
    audit("Удаление чертежа", "Чертежи", "Удален файл чертежа"),
    partDrawingFilesController.remove,
  );
  router.delete(
    "/parts/:id/drawing-image",
    authenticate,
    requireAdmin,
    audit("Удаление чертежа", "Чертежи", "Удален файл чертежа"),
    partDrawingFilesController.remove,
  );

  router.get("/parts", authenticate, partsController.getAll);
  router.post(
    "/parts",
    authenticate,
    requireAdmin,
    audit("Создание детали", "Детали", "Создана карточка детали"),
    partsController.create,
  );
  router.patch(
    "/parts/:id",
    authenticate,
    requireAdmin,
    audit("Редактирование детали", "Детали", "Изменена карточка детали"),
    partsController.update,
  );

  router.get("/purchases", authenticate, purchasesController.getAll);
  router.post(
    "/purchases",
    authenticate,
    requireAdmin,
    audit("Создание закупки", "Закупки", "Создана запись закупки"),
    purchasesController.create,
  );

  router.get("/departments", authenticate, async (_request, response) => {
    try {
      const result = await postgresPool.query(`
        SELECT
          id,
          name,
          manager,
          employee_count AS count
        FROM departments
        ORDER BY id ASC
      `);

      response.json(result.rows);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения подразделений",
      });
    }
  });

  router.get("/employees", authenticate, async (_request, response) => {
    try {
      const result = await postgresPool.query(`
        SELECT
          id,
          name,
          position,
          department,
          role
        FROM employees
        ORDER BY id ASC
      `);

      response.json(result.rows);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения сотрудников",
      });
    }
  });

  return router;
}
