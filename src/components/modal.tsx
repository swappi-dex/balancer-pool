export interface ModalProsp extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {}

function getClosestElement(ele: HTMLElement, selector: string) {
    if (ele.matches(selector)) {
        return ele;
    }
    return ele.closest(selector);
}

document.addEventListener('click', (e) => {
    if (e.target instanceof HTMLElement) {
        const activeEle = getClosestElement(e.target, '[data-modal-active]');

        if (!activeEle) {
            return;
        }
        const activeType = activeEle.getAttribute('data-modal-active');
        if (activeType) {
            const scopeEle = document.querySelector('[data-scope="modal"]');
            if (!scopeEle) {
                return;
            }
            if (activeType === 'open') {
                scopeEle.setAttribute('aria-expanded', 'true');
            }

            if (activeType === 'close') {
                scopeEle.removeAttribute('aria-expanded');
            }
        }
    }
});

export default function Modal({ ...rest }: ModalProsp) {
    return <div {...rest} data-scope="modal" className="hidden aria-expanded:flex fixed top-0 left-0 w-[100vw] h-[100vh] justify-center bg-black/60"></div>;
}
