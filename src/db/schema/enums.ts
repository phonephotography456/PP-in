import { pgEnum } from "drizzle-orm/pg-core";

export const photographerStatusEnum = pgEnum("photographer_status", [
  "pending",
  "approved",
  "rejected",
  "inactive",
]);

export const packageLevelEnum = pgEnum("package_level", [
  "basic",
  "standard",
  "premium",
]);

export const packageStatusEnum = pgEnum("package_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "inactive",
]);

export const portfolioImageStatusEnum = pgEnum("portfolio_image_status", [
  "pending_review",
  "approved",
  "rejected",
  "inactive",
]);

export const serviceStatusEnum = pgEnum("service_status", [
  "active",
  "inactive",
]);

export const brandStatusEnum = pgEnum("brand_status", [
  "active",
  "inactive",
]);

export const modelStatusEnum = pgEnum("model_status", [
  "active",
  "inactive",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
]);

export const userRoleEnum = pgEnum("user_role", [
  "photographer",
  "customer",
  "admin",
]);