def paginate(items, page, size):
    start = page * size
    return items[start:start + size]
