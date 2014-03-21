#
#   pipeline.py
#
#   N.B. predictive modelling requires a trained model in pickle form:
#   - get `quality_models.pck` from `Dropbox/cochranetech/quality-prediction-results/models`
#   - put in the `models/` directory
#

from abstract_pipeline import Pipeline
import pdb

# custom tokenizers based on NLTK
from tokenizers import word_tokenizer, sent_tokenizer

import collections

import cPickle as pickle

import quality3
import sklearn

import logging
logger = logging.getLogger(__name__)

import pprint
pp = pprint.PrettyPrinter(indent=2)


CORE_DOMAINS = ["Random sequence generation", "Allocation concealment", "Blinding of participants and personnel",
                "Blinding of outcome assessment", "Incomplete outcome data", "Selective reporting"]


class RiskOfBiasPipeline(Pipeline):
    """
    Predicts risk of bias document class + relevant sentences
    """
    pipeline_title = "Risk of Bias"

    def __init__(self):
        logger.info("loading models")
        self.doc_models, self.doc_vecs, self.sent_models, self.sent_vecs = self.load_models('models/quality_models.pck')
        logger.info("done loading models")

    def load_models(self, filename):
        with open(filename, 'rb') as f:
            data = pickle.load(f)
        return data

    def predict(self, full_text):

        logger.debug("starting prediction code")
        # first get sentence indices in full text
        sent_indices = sent_tokenizer.span_tokenize(full_text)

        # then the strings (for internal use only)
        sent_text = [full_text[start:end] for start, end in sent_indices]
        sent_text_dict = dict(zip(sent_indices, sent_text))

        output = []

        sent_preds_by_domain = [] # will rejig this later to make a list of dicts
        doc_preds = {}

        for test_domain, doc_model, doc_vec, sent_model, sent_vec in zip(CORE_DOMAINS, self.doc_models, self.doc_vecs, self.sent_models, self.sent_vecs):

            domain_row = {"name": test_domain}

            ####
            ## PART ONE - get the predicted sentences with risk of bias information
            ####

            # vectorize the sentences
            X_sents = sent_vec.transform(sent_text)


            # get predicted 1 / -1 for the sentences
            # bcw -- addint type conversion patch for numpy.int64 weirdness
            pred_sents = [int(x_i) for x_i in sent_model.predict(X_sents)]
            sent_preds_by_domain.append(pred_sents) # save them for later highlighting

            # for internal feature generation, get the sentences which are predicted 1
            positive_sents = [sent for sent, pred in zip(sent_text, pred_sents) if pred==1]
            positive_spans = [span for span, pred in zip(sent_indices, pred_sents) if pred==1]


            domain_row["annotations"] = [{"span": span, "sentence": sent, "label": 1} for span, sent in zip(positive_spans, positive_sents)]

            # make a single string per doc
            summary_text = " ".join(positive_sents)


            ####
            ##  PART TWO - integrate summarized and full text, then predict the document class
            ####

            doc_vec.builder_clear()
            doc_vec.builder_add_docs([full_text])
            doc_vec.builder_add_docs([summary_text], prefix="high-prob-sent-")

            X_doc = doc_vec.builder_transform()

            # change the -1s to 0s for now (TODO: improve on this)
            # done because the viewer has three classes, and we're only predicting two here
            domain_row["document"] = 1 if doc_model.predict(X_doc)[0] == 1 else 0

            output.append(domain_row)

        return output





