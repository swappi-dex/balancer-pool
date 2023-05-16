export interface ModalProsp extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {}

export default function Modal({ ...rest }: ModalProsp) {
    return (
        <div className="fixed top-0 left-0 w-[100vw] h-[100vh] flex justify-center bg-black/60">
            <div {...rest} />
        </div>
    );
}
