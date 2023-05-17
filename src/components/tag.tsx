export function Tag({ className, ...rest }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>) {
    return <div className={`inline-block px-[15px] py-[3px] text-sm leading-[17px] rounded-[32px] border border-[#fff] ${className}`} {...rest} />;
}
