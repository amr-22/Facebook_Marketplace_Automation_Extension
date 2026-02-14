function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }



// Find all spans with the exact text 'Share'
const shareSpans = Array.from(document.querySelectorAll('span'))
                      .filter(span => span.textContent.trim() === 'Share');
// For each found span, find the closest ancestor div with role="button" and click it
shareSpans.forEach(span => {
  const buttonDiv = span.closest('div[role="button"]');
  if (buttonDiv) {
    buttonDiv.click();
  } else {
    console.log('Found span:', span, ' - No closest div[role="button"] found.');
  }
});

await sleep(2000);

// get post link from whatsapp share
const whatsAppSpans = Array.from(document.querySelectorAll('span'))
                    .filter(span => span.textContent.trim() === 'WhatsApp');
// For each found span, find the closest <a> tag with role="link" to get link from it
whatsAppSpans.forEach(span => {
    const aTag = span.closest('a[role="link"]');
    if (aTag) {
    link = aTag.href;
    link = decodeURIComponent(link);
    url=new URL(link)
    url=url.search.replaceAll('?text=','').split('&')[0] ;
    console.log('url');
    } else {
    console.log('Found span:', span, ' - No closest div[role="button"] found.');
    }
});




// Find all spans with the exact text 'Share'
const locationSpans1 = Array.from(document.querySelectorAll('span'))
                    .filter(span => span.textContent.trim() === 'Location');
    locationSpans1.forEach(span => {
        locInput1 = span.closest('div').querySelector('input');
        locInput1.value = 'new Yourk';
        
    });


















