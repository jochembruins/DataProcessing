#!/usr/bin/env python
# Name: Jochem Bruins
# Student number: 10578811
"""
This script scrapes IMDB and outputs a CSV file with highest rated tv series.
"""

import re
import csv
from requests import get
from requests.exceptions import RequestException
from contextlib import closing
from bs4 import BeautifulSoup

TARGET_URL = "http://www.imdb.com/search/title?num_votes=5000,&sort=user_rating,desc&start=1&title_type=tv_series"
BACKUP_HTML = 'tvseries.html'
OUTPUT_CSV = 'tvseries.csv'


def extract_tvseries(dom):
    """
    Extract a list of highest rated TV series from DOM (of IMDB page).
    Each TV series entry should contain the following fields:
    - TV Title
    - Rating
    - Genres (comma separated if more than one)
    - Actors/actresses (comma separated if more than one)
    - Runtime (only a number!)
    """

    # ADD YOUR CODE HERE TO EXTRACT THE ABOVE INFORMATION ABOUT THE
    # HIGHEST RATED TV-SERIES
    # NOTE: FOR THIS EXERCISE YOU ARE ALLOWED (BUT NOT REQUIRED) TO IGNORE
    # UNICODE CHARACTERS AND SIMPLY LEAVE THEM OUT OF THE OUTPUT.

    
    # extract all div's containing the 50 series
    series = dom.find_all("div", class_="lister-item-content")
    
    # loop for all series in list
    for serie in series:
	    
	    # extract title
	    try:
	    	serie.title = serie.h3.a.string
	    except:
	    	serie.title = 'no title'	
	    
	    # extract serie rating as float
	    try:
	    	serie.rating = float(serie.find(itemprop="ratingValue")["content"])
	    except:
	    	serie.rating = 'no rating'
	    
	    # extract genres 
	    try:
	    	serie.genres = serie.find(class_="genre").string.strip()
	    except:
	    	serie.genres = 'no genres'	

	    # extract list of actors
	    try:
	    	actors_list = serie.find_all("a", href=re.compile("name"))

	    	# variable to store actors
	    	serie.actors = ''

	    	# take string containing actor name and add them to string
	    	for actor in actors_list:
	    		if serie.actors == '':
	    			serie.actors += actor.string
	    		else:
	    			serie.actors += ', ' + actor.string	
	    except:
	    	serie.actors = 'no actors'

	    # extract runtime as integer
	    try:
	    	runtime = serie.find(class_="runtime").string.strip()
	    	serie.runtime = int(re.sub('[^0-9]', '', runtime))
	    except:
	    	serie.runtime = 'no runtime'	
	
    return series


def save_csv(outfile, tvseries):
    """
    Output a CSV file containing highest rated TV-series.
    """
    writer = csv.writer(outfile)
    writer.writerow(['Title', 'Rating', 'Genre', 'Actors', 'Runtime'])

    # loop to write all extracted information in csv file
    for serie in tvseries:
    	writer.writerow([serie.title, serie.rating, serie.genres, serie.actors, serie.runtime])


def simple_get(url):
    """
    Attempts to get the content at `url` by making an HTTP GET request.
    If the content-type of response is some kind of HTML/XML, return the
    text content, otherwise return None
    """
    try:
        with closing(get(url, stream=True)) as resp:
            if is_good_response(resp):
                return resp.content
            else:
                return None
    except RequestException as e:
        print('The following error occurred during HTTP GET request to {0} : {1}'.format(url, str(e)))
        return None


def is_good_response(resp):
    """
    Returns true if the response seems to be HTML, false otherwise
    """
    content_type = resp.headers['Content-Type'].lower()
    return (resp.status_code == 200
            and content_type is not None
            and content_type.find('html') > -1)


if __name__ == "__main__":

    # get HTML content at target URL
    html = simple_get(TARGET_URL)

    # save a copy to disk in the current directory, this serves as an backup
    # of the original HTML, will be used in grading.
    with open(BACKUP_HTML, 'wb') as f:
        f.write(html)

    # parse the HTML file into a DOM representation
    dom = BeautifulSoup(html, 'html.parser')

    # extract the tv series (using the function you implemented)
    tvseries = extract_tvseries(dom)

    # write the CSV file to disk (including a header)
    with open(OUTPUT_CSV, 'w', newline='') as output_file:
        save_csv(output_file, tvseries)
