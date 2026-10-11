"""Exceptions exposed by the collector."""


class SocCollectorError(RuntimeError):
    """Base exception for collection failures."""


class SocRequestError(SocCollectorError):
    """The SOC service could not be fetched successfully."""


class SocResponseError(SocCollectorError):
    """The SOC service returned JSON with an unexpected shape."""
