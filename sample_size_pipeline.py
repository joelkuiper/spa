import cPickle as pickle
from collections import defaultdict
import logging
import math
from pprint import pprint
import re

#import pipeline

from indexnumbers import swap_num
from nltk import PorterStemmer
from nltk.tokenize import sent_tokenize
# from nltk.tokenize import word_tokenize
#from progressbar import ProgressBar

from tokenizers import newPunktWordTokenizer, filters
from pprint import pprint

word_tokenize = newPunktWordTokenizer().tokenize

with open('data/brill_pos_tagger.pck', 'rb') as f:
    pos_tagger = pickle.load(f)


class Pipeline(object):

    def __init__(self, text):
        self.text = text
        self.functions = [[{"w": word} for word in self.word_tokenize(sent)] for sent in self.sent_tokenize(swap_num(text))]
        self.load_templates()


    def load_templates(self):
        " used in subclasses to load template tuples "
        pass

    def sent_tokenize(self, text):
        return sent_tokenize(text)

    def word_tokenize(self, sent):
        return word_tokenize(sent)

    def generate_features(self, templates=None, show_progress=False):
        if not templates:
            templates = self.templates

        # 1. run base functions
        self.run_functions(show_progress=show_progress)
        
        # 2. apply templates
        self.X = self.apply_templates(templates, show_progress=show_progress)


    def run_functions(self, show_progress=False):
        " used in subclasses to chain together feature functions "
        raise NotImplemented

    def add_feature(self, feature_id, feature_fn):
        """ add a feature function later on
        after the main functions are made
        id = string
        feature_fn = lambda/other function to apply to each base function
        """

        len_text = len(self.functions)
        for sent_index in range(len_text):
            sent_len = len(self.functions[sent_index])
            for word_index in range(sent_len):
                self.functions[sent_index][word_index][feature_id] = feature_fn(self.functions[sent_index][word_index])


    def apply_templates(self, templates=None, show_progress=False):
        """
        based on crfutils
        """
        if not templates:
            templates = self.templates


        X = [[{} for word in sent] for sent in self.functions]
        if show_progress:
            pb = ProgressBar(len(templates) * len(X), timer=True)
        for template in templates:
            name = '|'.join(['%s[%d]' % (f, o) for f, o in template])
            for sent_index, X_sent in enumerate(X):
                if show_progress:
                    pb.tap()
                sent_len = len(X_sent)
                for word_index in range(sent_len):
                    # print sent_index, word_index
                    values = []
                    for field, offset in template:
                        p = word_index + offset
                        if p < 0 or p > (sent_len - 1):
                            values = []
                            break
                            values.append("_OUT_OF_RANGE_")
                        else:
                            value = self.functions[sent_index][p].get(field)
                            if value:
                                values.append(value)
                    if len(values)==1:    
                        X[sent_index][word_index][name] = values[0]
                    elif len(values)>1:
                        X[sent_index][word_index][name] = '|'.join([str(value) for value in values])

        if self.w_pos_window > 0:
            for sent_index, X_sent in enumerate(X):
                sent_len = len(X_sent)
                for word_index in range(sent_len):
                    for i in range(word_index-self.w_pos_window, word_index):
                        if i < 0 :
                            X[sent_index][word_index]["left window start of sentence"] = True
                        else:
                            word = self.functions[sent_index][i]
                            X[sent_index][word_index]["left window " + word["w"] + "|" + word["p"]] = 1#float(self.w_pos_window) / (word_index-i)

                    for i in range(word_index+1, word_index+self.w_pos_window):
                        if i > (sent_len - 1):
                            X[sent_index][word_index]["right window end of sentence"] = True
                        else:
                            word = self.functions[sent_index][i]
                            X[sent_index][word_index]["right window " + word["w"] + "|" + word["p"]] = 1#float(self.w_pos_window) / (i-word_index)


        


        return X


    def get_text(self):
        return self.text

    @filters
    def get_words(self):
        return [[word["w"] for word in sent] for sent in self.functions]

    @filters
    def get_base_functions(self):
        return self.functions

    @filters
    def get_answers(self, answer_key=lambda x: True):
        """
        returns y vectors for each sentence, where the answer_key
        is a lambda function which derives the answer from the 
        base (hidden) features
        """
        return [[answer_key(word) for word in sent] for sent in self.functions]

    @filters
    def get_features(self, filter=None, flatten=False):
        return self.X

    @filters
    def get_crfsuite_features(self):
        return [[["%s=%s" % (key, value) for key, value in word.iteritems()] for word in sent] for sent in self.X]
        



class bilearnPipeline(Pipeline):

    def __init__(self, text):
        self.functions = [[{"w": word, "p": pos} for word, pos in pos_tagger.tag(self.word_tokenize(sent))] for sent in self.sent_tokenize(swap_num(text))]
        self.load_templates()        
        self.text = text  
        

    def load_templates(self):
        self.templates = (
                          (("w_int", 0),),
                          # (("w", 1),),
                          # (("w", 2),),
                          # (("w", 3),),
                          # # (("wl", 4),),
                          # (("w", -1),),
                          # (("w", -2),),
                          # (("w", -3),),
                          # (("wl", -4),),
                          # (('w', -2), ('w',  -1)),
                          # (('wl',  -1), ('wl',  -2), ('wl',  -3)),
                          # (('stem', -1), ('stem',  0)),
                          # (('stem',  0), ('stem',  1)),
                          # (('w',  1), ('w',  2)),
                          # (('wl',  1), ('wl',  2), ('wl',  3)),
                          # (('p',  0), ('p',  1)),
                          # (('p',  1),),
                          # (('p',  2),),
                          # (('p',  -1),),
                          # (('p',  -2),),
                          # (('p',  1), ('p',  2)),
                          # (('p',  -1), ('p',  -2)),
                          # (('stem', -2), ('stem',  -1), ('stem',  0)),
                          # (('stem', -1), ('stem',  0), ('stem',  1)),
                          # (('stem', 0), ('stem',  1), ('stem',  2)),
                          # (('p', -2), ),
                          # (('p', -1), ),
                          # (('p', 1), ),
                          # (('p', 2), ),
                          # (('num', -1), ), 
                          # (('num', 1), ),
                          # (('cap', -1), ),
                          # (('cap', 1), ),
                          # (('sym', -1), ),
                          # (('sym', 1), ),
                          (('div10', 0), ),
                          (('>10', 0), ),
                          (('numrank', 0), ),
                          # (('p1', 1), ),
                          # (('p2', 1), ),
                          # (('p3', 1), ),
                          # (('p4', 1), ),
                          # (('s1', 1), ),
                          # (('s2', 1), ),
                          # (('s3', 0), ),
                          # (('s4', 0), ),
                          (('wi', 0), ),
                          (('si', 0), ),
                          # (('next_noun', 0), ),
                          # (('next_verb', 0), ),
                          # (('last_noun', 0), ),
                          # (('last_verb', 0), ),
                          (('in_num_list', 0), ),
                          )

        self.answer_key = "w"
        self.w_pos_window = 4 # set 0 for no w_pos window features
 
    def run_functions(self, show_progress=False):

        # make dict to look up ranking of number in abstract
        num_list_nest = [[int(word["w"]) for word in sent if word["w"].isdigit()] for sent in self.functions]
        num_list = [item for sublist in num_list_nest for item in sublist] # flatten
        num_list.sort(reverse=True)
        num_dict = {num: rank for rank, num in enumerate(num_list)}

        for i, sent_function in enumerate(self.functions):

            last_noun_index = 0
            last_noun = "BEGINNING_OF_SENTENCE"

            last_verb_index = 0
            last_verb = "BEGINNING_OF_SENTENCE"

            for j, function in enumerate(sent_function):
                # print j
                word = self.functions[i][j]["w"]
                features = {"num": word.isdigit(),
                            "cap": word[0].isupper(),
                            "sym": not word.isalnum(),
                            "p1": word[0],
                            "p2": word[:2],
                            "p3": word[:3],
                            "p4": word[:4],
                            "s1": word[-1],
                            "s2": word[-2:],
                            "s3": word[-3:],
                            "s4": word[-4:],
                            # "stem": self.stem.stem(word),
                            "wi": j,
                            "si": i,
                            "wl": word.lower()}
                if word.isdigit():
                    num = int(word)
                    features[">10"] = num > 10
                    features["w_int"] = num
                    features["div10"] = ((num % 10) == 0)
                    features["numrank"] = num_dict[num]
                
                self.functions[i][j].update(features)


                # self.functions[i][j].update(words)

                # if pos is a noun, back fill the previous words with 'next_noun'
                # and the rest as 'last_noun'
                pos = self.functions[i][j]["p"]
                
                if re.match("NN.*", pos):

                    for k in range(last_noun_index, j):
                        self.functions[i][k]["next_noun"] = word
                        self.functions[i][k]["last_noun"] = last_noun
                    last_noun_index = j
                    last_noun = word
                    
                # and the same for verbs
                elif re.match("VB.*", pos):

                    for k in range(last_verb_index, j):
                        
                        self.functions[i][k]["next_verb"] = word
                        self.functions[i][k]["last_verb"] = last_verb
                    last_verb_index = j
                    last_verb = word

            for k in range(last_noun_index, len(sent_function)):
                self.functions[i][k]["next_noun"] = "END_OF_SENTENCE"
                self.functions[i][k]["last_noun"] = last_noun

            for k in range(last_verb_index, len(sent_function)):
                self.functions[i][k]["next_verb"] = "END_OF_SENTENCE"
                self.functions[i][k]["last_verb"] = last_verb
