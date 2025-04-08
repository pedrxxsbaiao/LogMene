import { pgTable, serial, text, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  userType: text("user_type").notNull(), // "client" or "company"
  cpfCnpj: text("cpf_cnpj").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User schemas
export const insertUserSchema = createInsertSchema(users, {
  name: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email(),
  phone: z.string().min(10),
  userType: z.enum(["client", "company"]),
  cpfCnpj: z.string().min(11).max(18),
});

// Freight Requests
export const requestStatus = ["pending", "quoted", "accepted", "rejected", "completed"] as const;

export const freightRequests = pgTable("freight_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  clientOrderNumber: integer("client_order_number"), // Número sequencial específico por cliente
  // Campos de origem
  originCNPJ: text("origin_cnpj"),
  originCompanyName: text("origin_company_name"),
  originStreet: text("origin_street").notNull(),
  originCity: text("origin_city").notNull(),
  originState: text("origin_state").notNull(),
  originZipCode: text("origin_zip_code"),
  // Campos de destino
  destinationCNPJ: text("destination_cnpj"),
  destinationCompanyName: text("destination_company_name"),
  destinationStreet: text("destination_street").notNull(),
  destinationCity: text("destination_city").notNull(),
  destinationState: text("destination_state").notNull(),
  destinationZipCode: text("destination_zip_code"),
  // Informações da carga
  cargoType: text("cargo_type").notNull(),
  weight: real("weight").notNull(),
  invoiceValue: real("invoice_value").notNull(), // Valor da nota fiscal
  cargoDescription: text("cargo_description"),
  packageQuantity: integer("package_quantity"),
  // Informações de datas e notas
  pickupDate: text("pickup_date").notNull(),
  deliveryDate: text("delivery_date").notNull(),
  notes: text("notes"),
  requireInsurance: boolean("require_insurance").default(false),
  status: text("status", { enum: requestStatus }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Schema para inserção de solicitações de frete
export const insertFreightRequestSchema = z.object({
  userId: true,
  clientOrderNumber: true,
  // Campos de origem
  originCNPJ: true,
  originCompanyName: true,
  originStreet: true,
  originCity: true,
  originState: true,
  originZipCode: true,
  // Campos de destino
  destinationCNPJ: true,
  destinationCompanyName: true,
  destinationStreet: true,
  destinationCity: true,
  destinationState: true,
  destinationZipCode: true,
  // Informações da carga
  cargoType: true,
  weight: true,
  invoiceValue: true,
  cargoDescription: true,
  packageQuantity: true,
  // Outros campos
  pickupDate: true,
  deliveryDate: true,
  notes: true,
  requireInsurance: true,
  status: true,
}).extend({
  clientOrderNumber: z.number().optional(), // Campo opcional no schema, será preenchido automaticamente
}); 