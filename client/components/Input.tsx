interface InputProps {
  type: string
  className?: string
  placeholder?: string
  value: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

const Input = ({ type, className, placeholder, value, onChange, onKeyDown }: InputProps) => {
  return (
    <div>
      <input
        type={type || "text"}
        className={` border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0 border-offset-0 ${className}`}
        placeholder={placeholder || "Type a message..."}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}

export default Input;
