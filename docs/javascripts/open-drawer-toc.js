(function () {
   const MOBILE_BREAKPOINT = 960;
   const RETRY_LIMIT = 20;
   const RETRY_DELAY = 75;

   const openDrawerToc = () => {
     const drawer = document.querySelector('#__drawer');
     if (!drawer || window.innerWidth >= MOBILE_BREAKPOINT || !drawer.checked) return;

     let attempts = 0;
     const tryOpen = () => {
       const tocToggle = document.querySelector('#__toc');
       if (tocToggle) {
         tocToggle.checked = true;
         return;
       }
       if (attempts++ < RETRY_LIMIT) setTimeout(tryOpen, RETRY_DELAY);
     };
     tryOpen();
   };

   const onReady = () => {
     const drawer = document.querySelector('#__drawer');
     if (drawer) drawer.addEventListener('change', openDrawerToc);
     openDrawerToc();
   };

   if (window.document$) window.document$.subscribe(onReady);
   else document.addEventListener('DOMContentLoaded', onReady);

   window.addEventListener('resize', openDrawerToc);
 })();