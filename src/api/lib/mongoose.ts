import mongoose, { type Model, type Schema, type Types } from "mongoose"

/** Server-side id representation. Domain entities are generic over this. */
export type ObjectId = Types.ObjectId

/**
 * An entity as the database stores it: Mongoose supplies `_id`, so including
 * it in the schema generic makes Mongoose's own typings fight the entity's.
 */
export type SchemaOf<TEntity> = Omit<TEntity, "_id">

/**
 * `models.X || model("X", schema)` appears in all 31 model files for a real
 * reason — Next dev-server hot reload re-evaluates the module, and calling
 * `model()` twice for one name throws OverwriteModelError. This keeps that
 * behaviour and adds the cast in one place instead of thirty-one.
 */
export function defineModel<TSchema, TModel extends Model<TSchema> = Model<TSchema>>(
  name: string,
  schema: Schema<TSchema, TModel>
): TModel {
  const existing = mongoose.models[name] as TModel | undefined
  return existing ?? mongoose.model<TSchema, TModel>(name, schema)
}

/** Narrows an unknown id-ish value; used when validating `req.params` ids. */
export function isValidObjectId(value: unknown): value is string {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value)
}
