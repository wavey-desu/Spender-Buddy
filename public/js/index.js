$( document ).ready(function() {

    let progressContent = $(".svg-wrapper text").html()
    let progressContentN = parseFloat(progressContent.replace('%',''))    
    let circlePercent = Math.round(440 - (progressContentN * 4.4))
    
    $(".lightModeToggle").click(function(){
        $(".contentSection").toggleClass("darkMode")
        $(".whiteCircle").toggleClass("darkModeCircle")
        $("button").toggleClass("darkModeButton")
        $("svg text").toggleClass("darkModeSvgText")
        $(this).toggleClass("darkModeToggle")
    })

    $(".progressCircle").css('stroke-dashoffset', circlePercent)

    if(progressContentN <= 65){
        $(".progressCircle").css('stroke', '#23c483') 
    } else if(progressContentN <= 85 && progressContentN > 65 ){
        $(".progressCircle").css('stroke', '#ffff00') 
    } else if(progressContentN > 85){
        $(".progressCircle").css('stroke', '#c42323') 
    }

    $("tr:odd").css("background-color", "rgba(16,107,215,.3)")
    $("tr:even").css("background-color", "rgba(16,107,215,.5)")

    const mediaQuery = window.matchMedia('(max-width: 820px)');

    function screenChange(e){
        if (e.matches) {
            
            $(".menuBtn").click(function(){
                $(".profileSidebar").css("left", 0)
                $(".infoSidebar").css("right", "-100%")
                
            });
            $(".infoBtn").click(function(){
                $(".infoSidebar").css("right", 0);
                $(".profileSidebar").css("left", "-100%");
            })
            $(".itemsCont").click(function(){
                $(".infoSidebar").css("right", "-100%");
                $(".profileSidebar").css("left", "-100%");
        
            })
        }
    }

    mediaQuery.addListener(screenChange)
    screenChange(mediaQuery)


});