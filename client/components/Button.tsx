interface ButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean //React.ButtonHTMLAttributes<HTMLButtonElement>
  className?: string;
  children?: React.ReactNode;
}

const Button = ({ onClick, disabled, className, children }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-green-500 hover:bg-green-600 text-white p-2  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0 ${className}`}
    >
      {children}
    </button>
  )
}

export default Button;
