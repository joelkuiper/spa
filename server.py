import pdb

from flask import Flask, request, jsonify
from pipeline import RiskOfBiasPipeline, SampleSizePipeline
import json
import logging

DEBUG_MODE = True

logging.basicConfig(level=(logging.DEBUG if DEBUG_MODE else logging.INFO))
logger = logging.getLogger(__name__)

app = Flask(__name__)
pipeline = RiskOfBiasPipeline()
sample_size_pipeline = SampleSizePipeline()

@app.route('/')
def root():
    return app.send_static_file('index.html')

@app.route('/annotate', methods=['POST'])
def annotate():
    payload = json.loads(request.data)
    # sample size prediction result
    result_ss = sample_size_pipeline.run(payload["pages"])
    ### @TODO
    # this works fine (highlights sample size)
    return jsonify(result_ss) 

    # BUT I cannot figure out how to combine the results
    # and get them to render :(
    # specifically, this silly strategy does not seem to 
    # do the trick. in any case, i'm sure we'll want to do
    # something less hacky anyway in terms of 
    # chaining pipelines
    '''
    result["result"].append(result_ss["result"])
    return jsonify(result)
    '''

if __name__ == "__main__":
    app.run(debug=DEBUG_MODE)
