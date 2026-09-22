import {
  DataModelFromSchemaDefinition,
  DocumentByName as GenericDocumentByName,
} from "convex/server";
import { GenericId } from "convex/values";
import type schema from "../schema";

export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
export type TableNames = keyof DataModel;
export type Doc<TableName extends TableNames> = GenericDocumentByName<
  DataModel,
  TableName
>;
export type Id<TableName extends TableNames> = GenericId<TableName>;
