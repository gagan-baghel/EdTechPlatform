import { useEffect, useState, type KeyboardEvent } from "react"
import { MdClose } from "react-icons/md"
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

interface ChipInputProps<TFieldValues extends FieldValues = FieldValues> {
  label: string
  name: Path<TFieldValues>
  placeholder: string
  register: UseFormRegister<TFieldValues>
  errors: FieldErrors<TFieldValues>
  setValue: UseFormSetValue<TFieldValues>
  getValues: UseFormGetValues<TFieldValues>
}

export default function ChipInput<TFieldValues extends FieldValues = FieldValues>({
  label,
  name,
  placeholder,
  register,
  errors,
  setValue,
  getValues: _getValues,
}: ChipInputProps<TFieldValues>) {
  const { editCourse, course } = useSelector((state: RootState) => state.course)

  const [chips, setChips] = useState<string[]>(
    editCourse && course?.tag ? course.tag : []
  )

  useEffect(() => {
    register(name, { required: true, validate: (value: string[]) => value.length > 0 })
  }, [register, name])

  useEffect(() => {
    setValue(name, chips as FieldValue<TFieldValues>)
  }, [chips, name, setValue])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      const target = event.target as HTMLInputElement
      const chipValue = target.value.trim()
      if (chipValue && !chips.includes(chipValue)) {
        const newChips = [...chips, chipValue]
        setChips(newChips)
        target.value = ""
      }
    }
  }

  const handleDeleteChip = (chipIndex: number) => {
    const newChips = chips.filter((_, index) => index !== chipIndex)
    setChips(newChips)
  }

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm text-richblack-5" htmlFor={name}>
        {label} <sup className="text-pink-200">*</sup>
      </label>
      <div className="flex w-full flex-wrap gap-y-2">
        {chips.map((chip, index) => (
          <div
            key={index}
            className="m-1 flex items-center border border-richblack-600 bg-richblack-800 px-2 py-1 text-sm text-richblack-5"
          >
            {chip}
            <button
              type="button"
              className="ml-2 focus:outline-none"
              onClick={() => handleDeleteChip(index)}
            >
              <MdClose className="text-sm" />
            </button>
          </div>
        ))}
        <input
          id={name}
          name={name}
          type="text"
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          className="form-style w-full"
        />
      </div>
      {errors[name] && (
        <span className="ml-2 text-xs tracking-wide text-pink-200">
          {label} is required
        </span>
      )}
    </div>
  )
}
