var events = []

function clearEvents() {
    events = []
}

function lastMonday( now ) { 
    var res = new Date();
    if (!now) { 
        res = new Date();
    } else {
        res.setTime( now.getTime());
    }

    if ( res.getDay() > 1 ) {
        res.setTime( res.getTime() - ((res.getDay() + 1) * 24 * 60 * 60 * 1000) );
    } else if ( res.getDay() == 0 ) {
        res.setTime( res.getTime() - (6 * 24 * 60 * 60 * 1000) );
    }

    return res;
}

function nextMonday( now) {
    var res = new Date();
    res.setTime( now.getTime() + 7 * 24 * 60 * 60 * 1000 );
    return lastMonday( res );
}


function formatDate( d ) {
    var y = d.getFullYear();
    var m = d.getMonth()+1;
    if ( m < 10) {
        m = "0" + m;
    }
    var d = d.getDate();
    if ( d < 10) {
        d = "0" + d;
    }

    return y + "" + m + "" +  d + "T000000Z";
}

function parseDate( str ) {
    var year = parseInt( str.substring(0,4), 10);
    var month = parseInt( str.substring(4,6), 10);
    var day = parseInt( str.substring(6,8), 10);
    var res = new Date();
    res.setFullYear( year, month - 1, day );
    return res;
}

function parseTime( str ) {  
    if ( str.indexOf('T') < 0) {
        return -2 * 60*60;
    }
    var ofs = str.indexOf( 'T' ) + 1;
    var h = parseInt( str.substring(ofs,ofs+2), 10);
    var min = parseInt( str.substring(ofs+2,ofs+4), 10);
    var sec = parseInt( str.substring(ofs+4,ofs+6), 10);
    return h*60*60 + min*60 + sec;
}



function getReport( url, now, color,  onComplete) {
    var start = lastMonday( now );
    var end = nextMonday( now );
    end.setHours(0);
    end.setMinutes(0);
    end.setSeconds(0);
    end.setTime(end.getTime() - 1000 );


    q = "<?xml version='1.0'?>\n";
    q += "<c:calendar-query xmlns:c='urn:ietf:params:xml:ns:caldav'>\n";
    q += "  <d:prop xmlns:d='DAV:'>\n";
    q += "    <d:getetag/>\n";
    q += "    <c:calendar-data>\n";
    q += "    </c:calendar-data>\n";
    q += "  </d:prop>\n";
    q += "  <c:filter>\n";
    q += "    <c:comp-filter name='VCALENDAR'>\n";
    q += "      <c:comp-filter name='VEVENT'>\n";
    q += "        <c:time-range start='"+ formatDate( start ) + "' end='" + formatDate( end ) + "'/>\n";
    q += "      </c:comp-filter>\n";
    q += "    </c:comp-filter>\n";
    q += "  </c:filter>\n";
    q += "</c:calendar-query>\n";

    var req = new Request({
        data : q,
        method: 'REPORT',
        headers: { 'Content-Type': "application/xml" },
        url: url,
        onComplete: function( res ) {  onComplete( color, res ); },
    }).send();

    $('result').set('text', 'loading...');
}

var IcalEvent = {
    uid: "",
    summary: "",
    start: "",
    duration: "",
    color: ""
};

function parseCaldavResults( color, res ) {
    var parser = new DOMParser();
    var xmlObj = parser.parseFromString(res, "text/xml");
    var caldata = xmlObj.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav','calendar-data')

        r = ''
        //  var events = [];

        for( i=0; i < caldata.length; i++) {
            ev =  caldata[i].childNodes[0].nodeValue;
            //      alert( ev );
            arr = ev.split( '\n' );
            var e = Object.create(IcalEvent);
            e.color = color;
            var inEvent = 0;
            for( j=0; j < arr.length; j++) {
                if (arr[j].indexOf("BEGIN:VEVENT") >=0 ) {
                    inEvent = 1;
                }
                else if (arr[j].indexOf("END:VEVENT") >=0 ) {
                    inEvent = 0;
                }

                if ( inEvent ) {
                    if (arr[j].indexOf("SUMMARY:")>=0) {
                        e.summary = arr[j].substring( 8 );
                    }
                    else if (arr[j].indexOf("DTSTART")>=0) {
                        e.start = arr[j].substring( arr[j].indexOf(":")+1);
                    }
                    else if (arr[j].indexOf("DTEND")>=0) {
                        end =  arr[j].substring( arr[j].indexOf(":")+1)
                            e.duration = parseTime( end ) - parseTime( e.start );
                        if (e.duration == 0) { e.duration = 60 * 60  }
                    }
                }
            }
            events.push(e);
        }
    renderEvents( events );
}

function renderEvents( events ) { 
    r = "";
    offsets = [ 670, 10, 120, 230, 340, 450, 560 ];
    if ($('events').getChildren().length > 0) {
        $('events').getChildren().each( function( item ) {
                $('events').removeChild(item);
                });
    }
    for( i=0; i < events.length; i++) {
        r +=  events[i].start +  " " + events[i].summary + "\n";
        var l = offsets[ parseDate(events[i].start).getDay()];
        var t = 70 + parseTime( events[i].start )/180;
        var h  = events[i].duration / 180;
        var w = 100;

        for( j=0; j < events.length; j++) {
            if ( i != j && (parseDate(events[i].start).getTime() == parseDate(events[j].start).getTime())) {
                if (parseTime(events[i].start) < parseTime(events[j].start)) {
                    if ((parseTime(events[i].start) + events[i].duration) > parseTime(events[j].start)) {
                        w = 80;
                    }
                } else {
                    if ((parseTime(events[j].start) + events[j].duration) > parseTime(events[i].start)) {
                        w = 80;
                        l += 20;
                    }
                }
            }
        }

        var ev_div = new Element ( 'div' , { 'class': 'event', 'style':'top: ' + t + 'px; left: ' + l + 'px; height: ' + h + 'px; width: ' + w + '; background: ' + events[i].color + ';' }) ;
        ev_div.set('text', events[i].summary);
        ev_div.injectInside($('events'));
    }
    $('result').set('text', r);
}
