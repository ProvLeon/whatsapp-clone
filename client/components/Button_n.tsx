interface ButtonProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const Button = ({ children, className, onClick }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`bg-green-500 text-white rounded-lg p-2 focus:outline-none cursor-pointer hover:bg-green-600 active:scale-95 shadow-md ring-1 ring-green-600/80 ${className}`}
    >
      {children}
    </button>
  )
}

export default Button;
