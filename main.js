
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
            // add a marker to the map
            L.marker([lat, lon]).addTo(map);
            // set the view of the map to the lat and lon of the address
            map.setView([lat, lon], 17);


            // ----- 311 Data ----- //
            // make a request to the 311 api using lat lon since last year
            // let no_agency = "HPD"
            // let no_complaint = Food Poisoning, Adopt-A-Basket, HEAT/HOT WATER, WATER LEAK, Street Light Condition , Blocked Driveway, Taxi Complaint, PLUMBING    
            const url311 = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$select=unique_key,latitude,longitude,complaint_type,descriptor,created_date,resolution_description&$where=within_circle(location,${lat},${lon},200) and date_extract_y(created_date)>2022 and agency not in ('HDP') and complaint_type not in ('Blocked Driveway')&$limit=250&$order=created_date DESC`
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
                    console.log(sortable);
                    let top5 = sortable.slice(0, 5)
                    console.log(top5);

                    console.log(counts);
                    let summary = document.getElementById("summary")
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
                            radius: 10
                        }).addTo(map);
                        // add a popup to the marker
                        // format data as dd-mm-yyyy
                        date = date.slice(0, 10).split("-").reverse().join("-")
                        circle_311.bindTooltip(`<div class="my-tooltip"><b>${complaint}</b><br><br>${descriptor}<br>${date}</div>`).openPopup();
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








