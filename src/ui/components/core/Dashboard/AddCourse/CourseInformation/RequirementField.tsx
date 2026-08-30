import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { type FieldValues, type Path, type PathValue } from "react-hook-form"
import { type UseFormRegister, type UseFormSetValue, type UseFormGetValues, type FieldErrors } from "react-hook-form"

import type { RootState } from "../../../../../store"

/**
 * The value written here is fixed by this component (string[]), but the field it
 * writes to is chosen by the parent, so react-hook-form cannot prove the two
 * line up. The cast is narrow and local — the alternative was typing the whole
 * form as `any`, which would erase checking for every other field too.
 */
type FieldValue<T extends FieldValues> = PathValue<T, Path<T>>

interface RequirementsFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: Path<TFieldValues>
  label: string
  register: UseFormRegister<TFieldValues>
  setValue: UseFormSetValue<TFieldValues>
  errors: FieldErrors<TFieldValues>
  getValues: UseFormGetValues<TFieldValues>
}

export default function RequirementsField<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  register,
  setValue,
  errors,
  getValues: _getValues,
}: RequirementsFieldProps<TFieldValues>) {
  const { editCourse, course } = useSelector((state: RootState) => state.course)
  const [requirement, setRequirement] = useState("")
  const [requirementsList, setRequirementsList] = useState<string[]>(
    editCourse && course?.instructions ? course.instructions : []
  )

  useEffect(() => {
    register(name, { required: true, validate: (value: string[]) => value.length > 0 })
  }, [register, name])

  useEffect(() => {
    setValue(name, requirementsList as FieldValue<TFieldValues>)
  }, [requirementsList, name, setValue])

  const handleAddRequirement = () => {
    if (requirement) {
      setRequirementsList([...requirementsList, requirement])
      setRequirement("")
    }
  }

  const handleRemoveRequirement = (index: number) => {
    const updatedRequirements = [...requirementsList]
    updatedRequirements.splice(index, 1)
    setRequirementsList(updatedRequirements)
  }

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm text-richblack-5" htmlFor={name}>
        {label} <sup className="text-pink-200">*</sup>
      </label>
      <div className="flex flex-col items-start space-y-2">
        <input
          type="text"
          id={name}
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          className="form-style w-full"
        />
        <button
          type="button"
          onClick={handleAddRequirement}
          className="font-semibold text-yellow-50"
        >
          Add
        </button>
      </div>
      {requirementsList.length > 0 && (
        <ul className="mt-2 list-inside list-disc">
          {requirementsList.map((requirement, index) => (
            <li key={index} className="flex items-center text-richblack-5">
              <span>{requirement}</span>
              <button
                type="button"
                className="ml-2 text-xs text-pure-greys-300 "
                onClick={() => handleRemoveRequirement(index)}
              >
                clear
              </button>
            </li>
          ))}
        </ul>
      )}
      {errors[name] && (
        <span className="ml-2 text-xs tracking-wide text-pink-200">
          {label} is required
        </span>
      )}
    </div>
  )
}
