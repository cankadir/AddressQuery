
// import leaflet and initialte a map

var map = L.map('map');
// set map view to NYC
map.setView([40.7128, -74.0060], 13);
// set max zoom
map.options.maxZoom = 30;

// import the tile layer
tile_url = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
L.tileLayer( tile_url, {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

//  function to round numbers to 2 decimal places
function round(value, decimals) {
    value = Number(value)
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


// when button search is clicked get the value of the input
// and make a request to the nominatim api
document.getElementById("search").addEventListener("click", function () {
    let address = document.getElementById("address").value
    console.log(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${address}&format=json`
    let response = axios.get(url)
        .then(function (response) {
            // handle success
            let lat = response.data[0].lat
            let lon = response.data[0].lon
            console.log(lat, lon);
            // convert lat and lon to number
            // add a marker to the map
            L.marker([lat, lon]).addTo(map);
            // set the view of the map to the lat and lon of the address
            map.setView([lat, lon], 17);

            // ----- MAP PLUTO ----- //
            // make a request to the map pluto api using lat lon
            let add = 0.00075
            let pluto_url = `https://data.cityofnewyork.us/resource/64uk-42ks.json?$where=latitude>${ Number(lat)-add} AND latitude<${Number(lat)+add} AND longitude>${Number(lon)-add} AND longitude<${Number(lon)+add}`
            console.log(pluto_url);
            // query the api
            let response_pluto = axios.get(pluto_url)
                .then(function (response_pluto) {
                    console.log(response_pluto.data);
                    // iterate over the data and add a circle to the map
                    for (let i = 0; i < response_pluto.data.length; i++) {
                        let lot = response_pluto.data[i]
                        let p_lat = Number(lot.latitude)
                        let p_lon = Number(lot.longitude)

                        let circle = new L.Circle([p_lat,p_lon],{
                            color: 'blue',
                            fillColor: 'blue',
                            fillOpacity: 1,
                            radius: 3
                        }).addTo(map);
                        // add a popup to the marker

                        circle.bindPopup(`<b>${lot.address}</b><br><br>Land Use: ${lot.landuse}<br>Year Built: ${lot.yearbuilt}<br>Alteration 1: ${lot.yearalter1}<br>Alteration 2: ${lot.yearalter2}<br>Residential Area: ${numberWithCommas(round(lot.resarea,2))}<br>Building Area: ${round(lot.bldgarea,2)}<br>FAR: ${round(lot.residfar,2)}<br>Built FAR: ${round(lot.builtfar,2)}<br>Units: ${lot.unitsres}<br>School Dist: ${lot.schooldist}<br>Assesed Values: $${round(lot.assesstot,0)}`).openPopup();
                    }
                });


            // ----- 311 Data ----- //
            // make a request to the 311 api using lat lon since last year
            // let no_agency = "HPD"
            // let no_complaint = Food Poisoning, Adopt-A-Basket, HEAT/HOT WATER, WATER LEAK, Street Light Condition , Blocked Driveway, Taxi Complaint, PLUMBING    
            const url311 = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$select=unique_key,latitude,longitude,complaint_type,descriptor,created_date,resolution_description&$where=within_circle(location,${lat},${lon},200) and date_extract_y(created_date)>2022 and agency not in ('HDP') and complaint_type not in ('Blocked Driveway','Illegal Parking')&$limit=250&$order=created_date DESC`
            console.log(url311);
            let response311 = axios.get(url311)
                .then(function (response311) {
                    // handle success
                    console.log(response311.data);


                    // counts complaints by types and type it out to the summary div
                    let complaints = response311.data
                    let counts = {}
                    for (let i = 0; i < complaints.length; i++) {
                        let num = complaints[i].complaint_type
                        counts[num] = counts[num] ? counts[num] + 1 : 1;
                    }

                    // get top 5 complatins
                    let sortable = [];
                    for (let complaint in counts) {
                        sortable.push([complaint, counts[complaint]]);
                    }
                    sortable.sort(function (a, b) {
                        return b[1] - a[1];
                    });
                    let top5 = sortable.slice(0, 5)

                    let summary = document.getElementById("summary")
                    summary.innerHTML = '<h3 id="top">Top 5 Complaints</h3>'

                    for (let i = 0; i < top5.length; i++) {
                        summary.innerHTML += `${top5[i][0]}: ${top5[i][1]}<br>`
                    }

                    // loop through the data and add a marker to the map
                    for (let i = 0; i < response311.data.length; i++) {
                        let lat311 = response311.data[i].latitude
                        let lon311 = response311.data[i].longitude
                        let complaint = response311.data[i].complaint_type
                        let descriptor = response311.data[i].descriptor
                        let date = response311.data[i].created_date
                        let resolution = response311.data[i].resolution_description

                        // add a circle to the map
                        let circle_311 = L.circle([lat311, lon311],{
                            color: 'white',
                            fillColor: 'orange',
                            fillOpacity: 0.4,
                            radius: 6
                        }).addTo(map);
                        // add a popup to the marker
                        // format data as dd-mm-yyyy
                        date = date.slice(0, 10).split("-").reverse().join("-")
                        circle_311.bindTooltip(`<div class="my-tooltip"><b>${complaint}</b><br><br>${descriptor}</div>`).openPopup();
                        // circle_311 on hover log unique key
                        circle_311.on('mouseover', function (e) {
                            console.log(response311.data[i].unique_key);
                            // scroll to the complaint with the unique key
                            let complaint = document.getElementById(response311.data[i].unique_key)
                            complaint.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        });

                        // complaints
                        let complaints = document.getElementById("complaints")
                        complaints.innerHTML += `<div class="complaint" id=${response311.data[i].unique_key}><b>${complaint}</b><br><br>${descriptor}<br>${date}<br>${resolution}</div>`
                    }
                })
                .catch(function (error) {
                    // handle error
                    console.log(error);
                })
            
        })
        .catch(function (error) {
            // handle error
            console.log(error);
        }
        )
})








