import { Schema } from "mongoose"

import type { Category as CategoryEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const categorySchema = new Schema<SchemaOf<CategoryEntity<ObjectId>>>({
	name: {
		type: String,
		required: true,
	},
	description: { type: String },
	courses: [
		{
			type: Schema.Types.ObjectId,
			ref: "Course",
		},
	],
});

export const Category = defineModel("Category", categorySchema)
export default Category
