export interface ModalProsp extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDialogElement>, HTMLDialogElement> {}

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
            const dialogElements = document.querySelectorAll('dialog');
            const scopeEle = [...dialogElements].find((ele) => ele.matches('[data-scope="modal"]'));
            if (!scopeEle) {
                return;
            }
            if (activeType === 'open') {
                scopeEle.showModal();
                scopeEle.setAttribute('aria-expanded', 'true');
            }

            if (activeType === 'close') {
                scopeEle.close();
                scopeEle.removeAttribute('aria-expanded');
            }
        }
    }
});

export default function Modal({ ...rest }: ModalProsp) {
    // dialog 默认 display: none dailog open的情况下 hasAttribute open
    return <dialog {...rest} data-scope="modal" className="top-0 w-full h-full open:flex flex-col items-center bg-black/60"></dialog>;
}
