// Blur sibling branches rather than modal ancestors so nested dialogs stay sharp.
export function installModalFocus(){
  let frame=0;
  const marked=new Set();
  const options={subtree:true,childList:true,attributes:true,attributeFilter:['open','class']};
  const observer=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(update);});
  function update(){
    frame=0;observer.disconnect();
    for(const element of marked)element.classList.remove('modal-focus-blur');marked.clear();
    const native=[...document.querySelectorAll('dialog[open]')];
    const overlays=[...document.querySelectorAll('.modal.modal-open')];
    const modal=native.at(-1)||overlays.at(-1);
    if(modal){
      let branch=modal;
      while(branch.parentElement&&branch!==document.body){
        for(const sibling of branch.parentElement.children){
          if(sibling===branch||!(sibling instanceof HTMLElement)||['SCRIPT','STYLE','LINK'].includes(sibling.tagName))continue;
          sibling.classList.add('modal-focus-blur');marked.add(sibling);
        }
        branch=branch.parentElement;
      }
    }
    observer.observe(document.body,options);
  }
  update();
  return ()=>{observer.disconnect();cancelAnimationFrame(frame);for(const element of marked)element.classList.remove('modal-focus-blur');};
}
