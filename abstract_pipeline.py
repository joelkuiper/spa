from abc import ABCMeta, abstractmethod
import logging
from functools import wraps
import time

log = logging.getLogger(__name__)

def timethis(func):
    '''
    Decorator that reports the execution time.
    '''
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        log.debug("call to {} took {}".format(func.__name__, end-start))
        return result
    return wrapper

class OverlappingIntervals():
    """
    to duplicate the minimal function needed of an interval-tree
    maintains a list of start, end tuples
    and calculates overlaps
    """
    def __init__(self, intervals):
        """
        takes intervals = list of (start, end) tuples and sorts them
        """
        self.intervals = sorted(intervals)

    def _is_overlapping(self, i1, i2):
        return i2[0] < i1[1] and i1[0] < i2[1]


    def overlap(self, bounds):
        """
        bounds = (start, end) tuple
        returns all overlapping bounds
        """
        # TODO - we don't really need to iterate through *all* of these, since it's a sorted list
        # we can stop early once no overlaps possible
        #
        # Either this or don't bother sorting and keep this bit! (IM)
        return [interval for interval in self.intervals if self._is_overlapping(interval, bounds)]

    def overlap_indices(self, bounds):
        """
        return the 0 indexed positions of overlapping bounds
        """
        return [index for index, interval in enumerate(self.intervals) if self._is_overlapping(interval, bounds)]

class Pipeline(object):
    __metaclass__ = ABCMeta

    pipeline_title = ""

    def __preprocess(self, pages):
        # we need to do two things, create a single string for each page
        # and establish a method to figure out the original nodes
        parsed = []

        for idx, page in enumerate(pages):
            if page is not None:
                textNodes = [node["str"].encode("utf8") for node in page]

                total = 0
                ranges = []
                for txt in textNodes:

                    start = total
                    total += len(txt)
                    ranges.append((start, total))

                    total += 1
                    # note that this +=1 aligns both for spaces added later between nodes *and* pages
                    # (since the ' '.join(nodes) does not leave a trailing space, but we add one anyway)

                intervals = OverlappingIntervals(ranges)
                page_str = " ".join(textNodes)

                parsed.append({"str": page_str,
                               "length": total,
                               "intervals": intervals})
            else:
                log.debug("Attempted to parse empty page:" + str(idx))
                continue
        return parsed

    def get_page_offsets(self, page_lengths):
        " takes list of page lengths, returns cumulative list for offsets "
        # we store this because we want per document, not per page
        def accumulate(x, l=[0]):
            # since list l held by reference, value is stored between function calls!
            l[0] += x
            return l[0]

        return map(accumulate, [0] + page_lengths)

    def __postprocess(self, parsed_input, predictions):
        # get the page lengths, and the page offsets in the whole doc string
        page_lengths = [page["length"] for page in parsed_input]
        total_length = self.get_page_offsets(page_lengths)
        for p in predictions:
            for a in p["annotations"]:
                page_nr = next((i for i, v in enumerate(total_length) if v > a["span"][0])) - 1
                page = parsed_input[page_nr]
                offset = total_length[page_nr]

                bound = (a["span"][0] - offset, a["span"][1] - offset)
                nodes = page["intervals"].overlap_indices(bound)

                a["page"] = page_nr
                a["nodes"] = nodes
        return predictions

    @abstractmethod
    def predict(self):
        pass

    @timethis
    def run(self, input):
        parsed_pages = self.__preprocess(input)

        # get the predictions
        full_text = ' '.join(page["str"] for page in parsed_pages)
        prediction = self.__postprocess(parsed_pages, self.predict(full_text))

        return { "result": prediction }
