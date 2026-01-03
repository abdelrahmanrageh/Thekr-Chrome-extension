import csv
import json

data = []
with open ('cities15000.txt', 'r', encoding='utf-8') as file:
    reader = csv.DictReader(file , delimiter='\t' ,fieldnames = ["GeoNameID", "Name", "ASCII Name", "Alternate Names", "Latitude", "Longitude", "Feature Class", "Feature Code", "Country Code", "CC2", "Admin1 Code", "Admin2 Code", "Admin3 Code", "Admin4 Code", "Population", "Elevation", "DEM", "Timezone", "Modification Date"])
    for row in reader:
        city_info = {
            "name": row["Name"] + ", " + row["Country Code"],
            "alternate_names": row["Alternate Names"].split(","),
            "latitude": row["Latitude"],
            "longitude": row["Longitude"],
        }
        data.append(city_info)
with open('cities.json', 'w' , encoding='utf-8') as json_file:
    json.dump(data , json_file , ensure_ascii=False , indent=4) 