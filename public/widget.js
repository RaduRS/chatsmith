(function(){
  function findScript(){
    var s = document.currentScript
    if (s && s.getAttribute) return s
    var list = document.getElementsByTagName('script')
    for (var i = list.length - 1; i >= 0; i--) {
      var el = list[i]
      if (el.src && /\/widget\.js(\?.*)?$/.test(el.src)) return el
    }
    return null
  }
  function ready(fn){
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 0)
    } else {
      document.addEventListener('DOMContentLoaded', fn)
    }
  }
  var s = findScript()
  if(!s) return
  var chatbotId = s.getAttribute('data-chatbot-id') || ''
  var apiKey = s.getAttribute('data-api-key') || ''
  if(!chatbotId) return
  var srcUrl = new URL(s.src)
  var base = srcUrl.origin
  ready(function(){
    var style = document.createElement('style')
    style.textContent = 
      '.cs-widget-button{position:fixed;right:20px;bottom:20px;background:#111;color:#fff;border-radius:9999px;padding:12px 16px;font-size:14px;box-shadow:0 8px 30px rgba(0,0,0,0.15);cursor:pointer;z-index:2147483645}'+
      '.cs-widget-frame{position:fixed;right:20px;bottom:76px;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.18);z-index:2147483644;background:#fff;display:none}'+
      '@media (max-width:480px){.cs-widget-frame{right:10px;bottom:70px;width:calc(100vw - 20px);height:60vh}}'
    document.head.appendChild(style)

    var btn = document.createElement('button')
    btn.className = 'cs-widget-button'
    btn.textContent = 'Chat'
    btn.setAttribute('aria-label','Open chat')

    var frame = document.createElement('iframe')
    frame.className = 'cs-widget-frame'
    var iframeSrc = base + '/embed/' + encodeURIComponent(chatbotId)
    if(apiKey) iframeSrc += '?api_key=' + encodeURIComponent(apiKey)
    frame.src = iframeSrc
    frame.title = 'Chatbot'
    frame.allow = 'clipboard-read; clipboard-write'

    var open = false
    function toggle(){
      open = !open
      frame.style.display = open ? 'block' : 'none'
      btn.textContent = open ? 'Close' : 'Chat'
    }
    btn.addEventListener('click', toggle)

    document.body.appendChild(btn)
    document.body.appendChild(frame)
  })
})();